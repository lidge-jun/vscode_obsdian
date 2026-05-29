import type { RhwpResponse } from './types';

export function validateRhwpResponse(value: unknown): RhwpResponse | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    if (record.type !== 'rhwp-response') return undefined;
    if (typeof record.id !== 'number') return undefined;
    if (record.token !== undefined && typeof record.token !== 'string') return undefined;
    if (record.error !== undefined && typeof record.error !== 'string') return undefined;
    return record as unknown as RhwpResponse;
}
