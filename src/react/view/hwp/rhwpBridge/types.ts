export const DEFAULT_RHWP_REQUEST_TIMEOUT_MS = 30000;

export type HwpLoadStatusPayload =
    | { status: 'loading' }
    | { status: 'loaded'; pageCount?: number }
    | { status: 'warning'; message: string }
    | { status: 'failed'; message: string };

export interface SecureRhwpEditorOptions {
    studioUrl: string;
    width: string;
    height: string;
    requestTimeoutMs?: number;
    onLoadStatus?: (status: HwpLoadStatusPayload) => void;
}

export interface SecureRhwpEditor {
    loadFile(data: Uint8Array, fileName: string): Promise<unknown | undefined>;
    exportHwp(): Promise<ArrayBuffer | Uint8Array | number[]>;
    destroy(): void;
}

export interface RhwpResponse {
    type: 'rhwp-response';
    id: number;
    error?: string;
    result?: unknown;
}
