import { basename, dirname, extname, join } from 'path';
import { Handler } from '@/common/handler';
import { HWP_EVENTS, type HwpSavePayload } from '@/common/hwpMessageSchema';
import { Uri, window, workspace } from 'vscode';

const MAX_HWP_BYTES = 50 * 1024 * 1024;
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OVERWRITE = 'Overwrite';
const CHOOSE_ANOTHER = 'Choose Another File';

export function handleHwp(uri: { fsPath: string }, handler: Handler): void {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);
    const ext = extname(fsPath).toLowerCase();

    handler.on(HWP_EVENTS.init, async () => {
        try {
            const buffer = await workspace.fs.readFile(fileUri);
            validateHwpFile(buffer, ext);
            handler.emit(HWP_EVENTS.fileData, {
                fileName: basename(fsPath),
                buffer: Array.from(buffer),
                fileSize: buffer.byteLength,
                isHwpx: ext === '.hwpx',
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

    const experimentalSave = workspace
        .getConfiguration('vscode-obsdian')
        .get<boolean>('hwp.experimentalSave', false);
    if (experimentalSave) {
        handler.on(HWP_EVENTS.requestSave, async (content: HwpSavePayload) => {
            try {
                const bytes = new Uint8Array(content.bytes);
                validateExportedHwp(bytes);
                const targetUri = await resolveHwpSaveTarget(fileUri, fsPath, ext);
                if (!targetUri) {
                    handler.emit(HWP_EVENTS.saveResult, {
                        success: false,
                        error: 'Save cancelled',
                    });
                    return;
                }

                await atomicWriteFile(targetUri, bytes);
                handler.emit(HWP_EVENTS.saveResult, {
                    success: true,
                    savedPath: targetUri.fsPath,
                    convertedFromHwpx: ext === '.hwpx',
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

function validateHwpFile(buffer: Uint8Array, ext: string): void {
    if (buffer.byteLength > MAX_HWP_BYTES) {
        throw new Error(`HWP file is too large (${buffer.byteLength} bytes)`);
    }
    const expectedMagic = ext === '.hwpx' ? ZIP_MAGIC : OLE_MAGIC;
    if (!hasMagic(buffer, expectedMagic)) {
        throw new Error(`Invalid ${ext || 'HWP'} file signature`);
    }
}

function validateExportedHwp(bytes: Uint8Array): void {
    if (bytes.byteLength === 0) {
        throw new Error('Exported HWP is empty');
    }
    if (!hasMagic(bytes, OLE_MAGIC)) {
        throw new Error('Exported bytes are not a valid HWP file');
    }
}

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
    if (bytes.byteLength < magic.length) return false;
    return magic.every((value, index) => bytes[index] === value);
}

async function resolveHwpSaveTarget(fileUri: Uri, fsPath: string, ext: string): Promise<Uri | undefined> {
    if (ext === '.hwpx') {
        const hwpName = basename(fsPath, ext) + '.converted.hwp';
        const targetUri = Uri.file(join(dirname(fsPath), hwpName));
        return await resolveCollision(targetUri, 'Converted HWP already exists.');
    }

    const choice = await window.showWarningMessage(
        'Overwrite the current HWP file with experimental export output?',
        { modal: true },
        OVERWRITE,
        CHOOSE_ANOTHER,
    );
    if (choice === OVERWRITE) return fileUri;
    if (choice === CHOOSE_ANOTHER) {
        return await window.showSaveDialog({
            defaultUri: fileUri,
            filters: { 'HWP documents': ['hwp'] },
        });
    }
    return undefined;
}

async function resolveCollision(targetUri: Uri, message: string): Promise<Uri | undefined> {
    if (!await pathExists(targetUri)) return targetUri;

    const choice = await window.showWarningMessage(
        message,
        { modal: true },
        OVERWRITE,
        CHOOSE_ANOTHER,
    );
    if (choice === OVERWRITE) return targetUri;
    if (choice === CHOOSE_ANOTHER) {
        return await window.showSaveDialog({
            defaultUri: targetUri,
            filters: { 'HWP documents': ['hwp'] },
        });
    }
    return undefined;
}

async function pathExists(uri: Uri): Promise<boolean> {
    try {
        await workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

async function atomicWriteFile(targetUri: Uri, bytes: Uint8Array): Promise<void> {
    const tempUri = Uri.file(`${targetUri.fsPath}.tmp-${Date.now()}`);
    try {
        await workspace.fs.writeFile(tempUri, bytes);
        await workspace.fs.rename(tempUri, targetUri, { overwrite: true });
    } catch (error) {
        try {
            await workspace.fs.delete(tempUri);
        } catch {
            // Ignore cleanup errors and surface the original write failure.
        }
        throw error;
    }
}
