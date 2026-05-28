import { validateRhwpResponse } from './validateRhwpMessage';
import { DEFAULT_RHWP_REQUEST_TIMEOUT_MS, type SecureRhwpEditor, type SecureRhwpEditorOptions } from './types';

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeout: number;
}

export async function createSecureRhwpEditor(
    container: HTMLElement,
    options: SecureRhwpEditorOptions,
): Promise<SecureRhwpEditor> {
    const iframe = document.createElement('iframe');
    const expectedOrigin = new URL(options.studioUrl).origin;
    const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_RHWP_REQUEST_TIMEOUT_MS;
    const pending = new Map<number, PendingRequest>();
    let requestId = 0;
    let destroyed = false;

    iframe.src = options.studioUrl;
    iframe.style.width = options.width;
    iframe.style.height = options.height;
    iframe.style.border = '0';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads');
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

    function onMessage(event: MessageEvent): void {
        if (event.source !== iframe.contentWindow) return;
        if (event.origin !== expectedOrigin) return;

        const message = validateRhwpResponse(event.data);
        if (!message) return;

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
        return new Promise((resolve, reject) => {
            const id = ++requestId;
            const timeout = window.setTimeout(() => {
                pending.delete(id);
                reject(new Error(`Request timeout: ${method}`));
            }, timeoutMs);

            pending.set(id, { resolve, reject, timeout });
            iframe.contentWindow?.postMessage({ type: 'rhwp-request', id, method, params }, expectedOrigin);
        });
    }

    async function waitReady(): Promise<void> {
        for (let i = 0; i < 30; i++) {
            try {
                if (await request('ready', {}, 500)) return;
            } catch {
                // Retry while rhwp-studio initializes its WASM runtime.
            }
            await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
        throw new Error('Editor initialization timeout');
    }

    window.addEventListener('message', onMessage);
    await waitForIframeLoad(iframe, container);
    await waitReady();

    return {
        async loadFile(data: Uint8Array, fileName: string): Promise<unknown | undefined> {
            options.onLoadStatus?.({ status: 'loading' });
            try {
                const result = await request('loadFile', { data: Array.from(data), fileName });
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

function waitForIframeLoad(iframe: HTMLIFrameElement, container: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('Failed to load rhwp-studio iframe'));
        container.appendChild(iframe);
    });
}

function getPageCount(value: unknown): number | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    return typeof record.pageCount === 'number' ? record.pageCount : undefined;
}
