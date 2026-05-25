import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { basename, dirname, join, parse } from 'path';
import { Global } from '@/common/global';

export interface LibreOfficeResult {
    pdfPath?: string;
    warning?: string;
}

export async function convertPresentationWithLibreOffice(inputPath: string, outputRoot: string): Promise<LibreOfficeResult> {
    const executable = Global.getConfig<string>('pptx.libreOfficePath', '');
    if (!executable) {
        return { warning: 'LibreOffice fallback is not configured. Set vscode-office.pptx.libreOfficePath to enable legacy .ppt conversion.' };
    }
    if (!existsSync(executable)) {
        return { warning: `LibreOffice executable does not exist: ${executable}` };
    }

    const timeoutMs = Global.getConfig<number>('pptx.conversionTimeoutMs', 30000);
    const fallbackRoot = join(outputRoot, 'pptx-fallback');
    const outputDir = join(fallbackRoot, outputDirectoryName(inputPath));
    cleanupFallbackRoot(fallbackRoot, outputDir);
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });

    const result = await runLibreOffice(executable, inputPath, outputDir, timeoutMs);
    if (result) return { warning: result };

    const pdfPath = join(outputDir, `${parse(inputPath).name}.pdf`);
    if (!existsSync(pdfPath)) {
        return { warning: `LibreOffice did not create ${basename(pdfPath)}.` };
    }
    return { pdfPath };
}

function outputDirectoryName(inputPath: string): string {
    const stat = statSync(inputPath);
    const hash = createHash('sha1').update(`${inputPath}:${stat.mtimeMs}:${stat.size}`).digest('hex').slice(0, 12);
    return `${parse(inputPath).name}-${hash}`;
}

function cleanupFallbackRoot(root: string, currentOutputDir: string): void {
    if (!existsSync(root)) return;
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    for (const entry of readdirSync(root)) {
        const fullPath = join(root, entry);
        if (fullPath === currentOutputDir) continue;
        try {
            const stat = statSync(fullPath);
            if (Date.now() - stat.mtimeMs > maxAgeMs) {
                rmSync(fullPath, { recursive: true, force: true });
            }
        } catch {
            // Cleanup is best-effort and must not block conversion.
        }
    }
}

function runLibreOffice(executable: string, inputPath: string, outputDir: string, timeoutMs: number): Promise<string | undefined> {
    return new Promise(resolve => {
        const child = spawn(executable, ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputPath], {
            cwd: dirname(inputPath),
        });
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill();
            resolve(`LibreOffice conversion timed out after ${timeoutMs}ms.`);
        }, timeoutMs);

        child.stderr.on('data', chunk => {
            stderr += chunk.toString();
        });
        child.on('error', error => {
            clearTimeout(timer);
            resolve(error.message);
        });
        child.on('close', code => {
            clearTimeout(timer);
            resolve(code === 0 ? undefined : stderr || `LibreOffice exited with code ${code}.`);
        });
    });
}
