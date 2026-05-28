export const HWP_EVENTS = {
    init: 'hwp:init',
    fileData: 'hwp:fileData',
    requestSave: 'hwp:requestSave',
    saveResult: 'hwp:saveResult',
    error: 'hwp:error',
} as const;

export type HwpEventName = typeof HWP_EVENTS[keyof typeof HWP_EVENTS];

export interface HwpFileDataPayload {
    fileName: string;
    buffer: number[];
    fileSize: number;
    isHwpx: boolean;
    error?: string;
}

export interface HwpSavePayload {
    bytes: number[];
    sourceFileName: string;
    isHwpx: boolean;
}

export interface HwpSaveResultPayload {
    success: boolean;
    savedPath?: string;
    convertedFromHwpx?: boolean;
    error?: string;
}

export interface HwpErrorPayload {
    error: string;
}

const HWP_EVENT_VALUES = new Set<string>(Object.values(HWP_EVENTS));

export function isHwpEvent(value: unknown): value is HwpEventName {
    return typeof value === 'string' && HWP_EVENT_VALUES.has(value);
}

export function validateHwpPayload(type: HwpEventName, payload: unknown): boolean {
    switch (type) {
        case HWP_EVENTS.init:
            return payload === undefined || isEmptyObject(payload);
        case HWP_EVENTS.fileData:
            return isHwpFileDataPayload(payload);
        case HWP_EVENTS.requestSave:
            return isHwpSavePayload(payload);
        case HWP_EVENTS.saveResult:
            return isHwpSaveResultPayload(payload);
        case HWP_EVENTS.error:
            return isHwpErrorPayload(payload);
        default:
            return false;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmptyObject(value: unknown): boolean {
    return isRecord(value) && Object.keys(value).length === 0;
}

function isByteArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) =>
        Number.isInteger(item) && item >= 0 && item <= 255
    );
}

function isHwpFileDataPayload(value: unknown): value is HwpFileDataPayload {
    if (!isRecord(value)) return false;
    return typeof value.fileName === 'string'
        && isByteArray(value.buffer)
        && typeof value.fileSize === 'number'
        && value.fileSize >= 0
        && typeof value.isHwpx === 'boolean'
        && (value.error === undefined || typeof value.error === 'string');
}

function isHwpSavePayload(value: unknown): value is HwpSavePayload {
    if (!isRecord(value)) return false;
    return isByteArray(value.bytes)
        && value.bytes.length > 0
        && typeof value.sourceFileName === 'string'
        && typeof value.isHwpx === 'boolean';
}

function isHwpSaveResultPayload(value: unknown): value is HwpSaveResultPayload {
    if (!isRecord(value)) return false;
    return typeof value.success === 'boolean'
        && (value.savedPath === undefined || typeof value.savedPath === 'string')
        && (value.convertedFromHwpx === undefined || typeof value.convertedFromHwpx === 'boolean')
        && (value.error === undefined || typeof value.error === 'string');
}

function isHwpErrorPayload(value: unknown): value is HwpErrorPayload {
    return isRecord(value) && typeof value.error === 'string';
}
