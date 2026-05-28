import { basename, dirname, extname, join } from 'path';
import { readFileSync } from 'fs';
import { Handler } from '@/common/handler';
import { Uri, workspace } from 'vscode';

export function handleHwp(uri: { fsPath: string }, handler: Handler): void {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);
    const ext = extname(fsPath).toLowerCase();

    handler.on('init', async () => {
        try {
            const buffer = readFileSync(fsPath);
            const array = [...new Uint8Array(buffer)];
            handler.emit('hwpData', {
                fileName: basename(fsPath),
                buffer: array,
                fileSize: buffer.byteLength,
                isHwpx: ext === '.hwpx',
            });
        } catch (e) {
            handler.emit('hwpData', {
                fileName: basename(fsPath),
                buffer: [],
                fileSize: 0,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    });

    handler.on('saveHwp', async (content: number[]) => {
        try {
            const bytes = new Uint8Array(content);
            let targetUri = fileUri;

            if (ext === '.hwpx') {
                const hwpName = basename(fsPath, ext) + '.hwp';
                targetUri = Uri.file(join(dirname(fsPath), hwpName));
            }

            await workspace.fs.writeFile(targetUri, bytes);
            handler.emit('hwpSaved', {
                success: true,
                savedPath: targetUri.fsPath,
                convertedFromHwpx: ext === '.hwpx',
            });
        } catch (e) {
            handler.emit('hwpSaved', {
                success: false,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    });
}
