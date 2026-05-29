import { validateRhwpResponse } from './validateRhwpMessage';
import {
    DEFAULT_RHWP_READY_TIMEOUT_MS,
    DEFAULT_RHWP_REQUEST_TIMEOUT_MS,
    type SecureRhwpEditor,
    type SecureRhwpEditorOptions,
} from './types';

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeout: number;
}

type DirectBridgeMethod = (params?: Record<string, unknown>) => Promise<unknown> | unknown;

interface RhwpDirectBridge {
    [method: string]: DirectBridgeMethod | undefined;
}

interface RhwpBridgeWindow extends Window {
    __rhwpBridge?: RhwpDirectBridge;
}

export async function createSecureRhwpEditor(
    container: HTMLElement,
    options: SecureRhwpEditorOptions,
): Promise<SecureRhwpEditor> {
    const iframe = document.createElement('iframe');
    const expectedOrigin = options.expectedOrigin ?? resolveExpectedOrigin(options);
    const expectedOrigins = new Set(options.expectedOrigins ?? [expectedOrigin]);
    const targetOrigin = options.targetOrigin ?? (options.studioHtml ? '*' : expectedOrigin);
    const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_RHWP_REQUEST_TIMEOUT_MS;
    const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_RHWP_READY_TIMEOUT_MS;
    const bridgeToken = createBridgeToken();
    // VS Code srcdoc iframes can report browser-specific origins/sources.
    // This branch is only used for the bundled local rhwp-studio HTML.
    const shouldCheckOrigin = !options.studioHtml;
    const shouldCheckSource = !options.studioHtml;
    const shouldCheckToken = Boolean(options.studioHtml);
    const pending = new Map<number, PendingRequest>();
    let requestId = 0;
    let destroyed = false;

    iframe.style.width = options.width;
    iframe.style.height = options.height;
    iframe.style.border = '0';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    if (options.studioHtml) {
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads');
        iframe.srcdoc = buildSrcdoc(options.studioHtml, options.studioBaseUrl);
    } else if (options.studioUrl) {
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads');
        iframe.src = options.studioUrl;
    } else {
        throw new Error('Missing rhwp-studio URL or HTML');
    }

    function onMessage(event: MessageEvent): void {
        if (shouldCheckSource && event.source !== iframe.contentWindow) return;
        if (shouldCheckOrigin && !expectedOrigins.has(event.origin)) return;

        const message = validateRhwpResponse(event.data);
        if (!message) return;
        if (shouldCheckToken && message.token !== bridgeToken) return;

        const pendingRequest = pending.get(message.id);
        if (!pendingRequest) return;

        window.clearTimeout(pendingRequest.timeout);
        pending.delete(message.id);

        if (message.error) {
            pendingRequest.reject(new Error(message.error));
            return;
        }
        pendingRequest.resolve(message.result);
    }

    function request(method: string, params: Record<string, unknown> = {}, timeoutMs = requestTimeoutMs): Promise<unknown> {
        if (destroyed) return Promise.reject(new Error('Editor destroyed'));
        if (options.studioHtml) {
            return requestLocalBridge(method, params, timeoutMs);
        }

        return requestPostMessage(method, params, timeoutMs);
    }

    async function requestLocalBridge(
        method: string,
        params: Record<string, unknown>,
        timeoutMs: number,
    ): Promise<unknown> {
        const directMethod = await waitForDirectBridgeMethod(iframe, method, Math.min(750, timeoutMs));
        if (directMethod) {
            return await withRequestTimeout(Promise.resolve(directMethod(params)), method, timeoutMs);
        }
        if (method === 'loadFile') {
            postMessageWithoutResponse(method, params);
            await new Promise((resolve) => window.setTimeout(resolve, Math.min(1500, timeoutMs)));
            return undefined;
        }
        return requestPostMessage(method, params, timeoutMs);
    }

    function requestPostMessage(
        method: string,
        params: Record<string, unknown>,
        timeoutMs: number,
    ): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const id = ++requestId;
            const timeout = window.setTimeout(() => {
                pending.delete(id);
                reject(new Error(`Request timeout: ${method}`));
            }, timeoutMs);

            pending.set(id, { resolve, reject, timeout });
            iframe.contentWindow?.postMessage({ type: 'rhwp-request', id, token: bridgeToken, method, params }, targetOrigin);
        });
    }

    function postMessageWithoutResponse(method: string, params: Record<string, unknown>): void {
        const id = ++requestId;
        iframe.contentWindow?.postMessage({ type: 'rhwp-request', id, token: bridgeToken, method, params }, targetOrigin);
    }

    async function waitReady(): Promise<void> {
        const deadline = Date.now() + readyTimeoutMs;
        while (Date.now() < deadline) {
            try {
                if (await request('ready', {}, 1000)) return;
            } catch {
                // Retry while rhwp-studio initializes its WASM runtime.
            }
            await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
        throw new Error(`Editor initialization timeout after ${Math.round(readyTimeoutMs / 1000)}s`);
    }

    window.addEventListener('message', onMessage);
    await waitForIframeLoad(iframe, container);
    if (!options.studioHtml) {
        await waitReady();
    }

    return {
        async loadFile(data: Uint8Array, fileName: string): Promise<unknown | undefined> {
            options.onLoadStatus?.({ status: 'loading' });
            try {
                const result = await request('loadFile', { data: Array.from(data), fileName, skipUnsavedGuard: true });
                const pageCount = getPageCount(result);
                options.onLoadStatus?.(pageCount === undefined ? { status: 'loaded' } : { status: 'loaded', pageCount });
                return result;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (message.includes('timeout')) {
                    options.onLoadStatus?.({ status: 'warning', message });
                    return undefined;
                }
                options.onLoadStatus?.({ status: 'failed', message });
                throw error;
            }
        },
        async exportHwp(): Promise<ArrayBuffer | Uint8Array | number[]> {
            return await request('exportHwp') as ArrayBuffer | Uint8Array | number[];
        },
        destroy(): void {
            destroyed = true;
            window.removeEventListener('message', onMessage);
            pending.forEach((pendingRequest) => {
                window.clearTimeout(pendingRequest.timeout);
                pendingRequest.reject(new Error('Editor destroyed'));
            });
            pending.clear();
            iframe.remove();
        },
    };
}

async function waitForDirectBridgeMethod(
    iframe: HTMLIFrameElement,
    method: string,
    timeoutMs: number,
): Promise<DirectBridgeMethod | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const directBridge = getDirectBridge(iframe);
        const directMethod = directBridge?.[method];
        if (directMethod) {
            return directMethod;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return undefined;
}

function waitForIframeLoad(iframe: HTMLIFrameElement, container: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('Failed to load rhwp-studio iframe'));
        container.appendChild(iframe);
    });
}

function getDirectBridge(iframe: HTMLIFrameElement): RhwpDirectBridge | undefined {
    try {
        return (iframe.contentWindow as RhwpBridgeWindow | null)?.__rhwpBridge;
    } catch {
        return undefined;
    }
}

function withRequestTimeout(promise: Promise<unknown>, method: string, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            reject(new Error(`Request timeout: ${method}`));
        }, timeoutMs);

        promise
            .then(resolve, reject)
            .finally(() => window.clearTimeout(timeout));
    });
}

function resolveExpectedOrigin(options: SecureRhwpEditorOptions): string {
    if (options.studioHtml) return window.location.origin;
    if (options.studioUrl) return new URL(options.studioUrl).origin;
    throw new Error('Missing rhwp-studio URL or HTML');
}

function createBridgeToken(): string {
    try {
        const values = new Uint32Array(4);
        window.crypto.getRandomValues(values);
        return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
}

function buildSrcdoc(html: string, baseUrl?: string): string {
    if (!baseUrl) return html;
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return html.replace('<head>', `<head><base href="${escapeHtmlAttribute(normalizedBase)}">`);
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getPageCount(value: unknown): number | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    return typeof record.pageCount === 'number' ? record.pageCount : undefined;
}
