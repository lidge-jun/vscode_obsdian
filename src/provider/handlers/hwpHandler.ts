import { basename, extname } from 'path';
import { Handler } from '@/common/handler';
import {
    HWP_EVENTS,
    type HwpDirtyChangedPayload,
    type HwpSavePayload,
    type HwpVscodeSaveResponsePayload,
} from '@/common/hwpMessageSchema';
import { Uri, workspace } from 'vscode';
import {
    resolveToolbarSaveTarget,
    validateExportedDocument,
    validateHwpFile,
    writeHwpDocument,
} from '@/provider/hwp/hwpSaveService';

interface HwpHandlerOptions {
    studioHtml?: string;
    studioBaseUrl?: string;
    initialBuffer?: Uint8Array;
    onDirtyChange?: (isDirty: boolean) => void;
    onVscodeSavePayload?: (payload: HwpVscodeSaveResponsePayload) => void;
}

export function handleHwp(uri: { fsPath: string }, handler: Handler, options: HwpHandlerOptions = {}): void {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);
    const ext = extname(fsPath).toLowerCase();

    handler.on(HWP_EVENTS.init, async () => {
        try {
            const buffer = options.initialBuffer ?? await workspace.fs.readFile(fileUri);
            validateHwpFile(buffer, ext);
            handler.emit(HWP_EVENTS.fileData, {
                fileName: basename(fsPath),
                buffer: Array.from(buffer),
                fileSize: buffer.byteLength,
                isHwpx: ext === '.hwpx',
                studioHtml: options.studioHtml,
                studioBaseUrl: options.studioBaseUrl,
            });
        } catch (e) {
            handler.emit(HWP_EVENTS.fileData, {
                fileName: basename(fsPath),
                buffer: [],
                fileSize: 0,
                isHwpx: ext === '.hwpx',
                error: e instanceof Error ? e.message : String(e),
            });
        }
    });

    handler.on(HWP_EVENTS.dirtyChanged, (content: HwpDirtyChangedPayload) => {
        options.onDirtyChange?.(content.isDirty);
    });

    handler.on(HWP_EVENTS.vscodeSavePayload, (content: HwpVscodeSaveResponsePayload) => {
        options.onVscodeSavePayload?.(content);
    });

    const experimentalSave = workspace
        .getConfiguration('vscode-obsdian')
        .get<boolean>('hwp.experimentalSave', true);
    if (experimentalSave) {
        handler.on(HWP_EVENTS.requestSave, async (content: HwpSavePayload) => {
            try {
                const bytes = new Uint8Array(content.bytes);
                validateExportedDocument(bytes, content.format);
                const targetUri = await resolveToolbarSaveTarget(fileUri, fsPath, ext, content.format);
                if (!targetUri) {
                    handler.emit(HWP_EVENTS.saveResult, {
                        success: false,
                        error: 'Save cancelled',
                    });
                    return;
                }

                await writeHwpDocument(targetUri, bytes, content.format);
                options.onDirtyChange?.(false);
                handler.emit(HWP_EVENTS.saveResult, {
                    success: true,
                    savedPath: targetUri.fsPath,
                    convertedFromHwpx: ext === '.hwpx' && content.format === 'hwp',
                    format: content.format,
                });
            } catch (e) {
                handler.emit(HWP_EVENTS.saveResult, {
                    success: false,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        });
    }
}
