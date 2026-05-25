import * as path from 'path';
import * as vscode from 'vscode';
import { ParsedWikilink } from './wikilinkParser';

interface Candidate {
    uri: vscode.Uri;
    label: string;
    description: string;
    score: number;
}

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

export class WikilinkResolver {
    async open(sourceUri: vscode.Uri, link: ParsedWikilink): Promise<void> {
        try {
            const target = await this.resolve(sourceUri, link);
            if (!target) return;
            const document = await vscode.workspace.openTextDocument(target);
            const editor = await vscode.window.showTextDocument(document);
            if (link.blockId) {
                this.revealBlock(editor, document, link.blockId);
            } else if (link.heading) {
                this.revealHeading(editor, document, link.heading);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Unable to open wikilink: ${message}`);
        }
    }

    async resolve(sourceUri: vscode.Uri, link: ParsedWikilink): Promise<vscode.Uri | undefined> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('Wikilinks require a workspace folder.');
            return undefined;
        }

        const rawTarget = link.target.trim();
        if (isUnsafeTarget(rawTarget)) {
            vscode.window.showWarningMessage('Absolute wikilink paths are not supported.');
            return undefined;
        }
        const target = normalizeTarget(rawTarget);
        if (!target) {
            return link.heading || link.blockId ? sourceUri : undefined;
        }

        const sourceDir = path.dirname(sourceUri.fsPath);
        const targetHasPath = hasExplicitPath(target);
        if (targetHasPath) {
            const direct = await this.resolveDirect(sourceDir, workspaceFolder.uri.fsPath, target);
            if (direct) return direct;
        }

        const candidates = await this.findCandidates(workspaceFolder, sourceDir, target);
        if (candidates.length === 0) {
            vscode.window.showWarningMessage(`No Markdown note found for [[${link.target}]].`);
            return undefined;
        }

        const [first, second] = candidates;
        if (!second) return first.uri;
        if (targetHasPath && first.score < second.score) return first.uri;

        const picked = await vscode.window.showQuickPick(
            candidates.map(candidate => ({
                label: candidate.label,
                description: candidate.description,
                candidate,
            })),
            { placeHolder: `Select target for [[${link.target}]]` }
        );

        return picked?.candidate.uri;
    }

    async listMarkdownFiles(): Promise<vscode.Uri[]> {
        const allFiles = await Promise.all([
            vscode.workspace.findFiles('**/*.md'),
            vscode.workspace.findFiles('**/*.markdown'),
        ]);
        return allFiles.flat().filter(uri => !isIgnoredPath(uri.fsPath));
    }

    async completionTargets(sourceUri: vscode.Uri): Promise<string[]> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!workspaceFolder) return [];
        const files = await this.listMarkdownFiles();
        const sourceDir = path.dirname(sourceUri.fsPath);

        return files
            .filter(uri => uri.toString() !== sourceUri.toString())
            .map(uri => this.targetForFile(workspaceFolder.uri.fsPath, sourceDir, uri.fsPath))
            .sort((a, b) => a.localeCompare(b));
    }

    private async resolveDirect(sourceDir: string, workspaceRoot: string, target: string): Promise<vscode.Uri | undefined> {
        const candidates = targetHasMarkdownExtension(target)
            ? [target]
            : [`${target}.md`, `${target}.markdown`];

        for (const candidate of candidates) {
            const resolved = path.resolve(sourceDir, candidate);
            if (!isInside(workspaceRoot, resolved)) continue;
            try {
                const uri = vscode.Uri.file(resolved);
                const stat = await vscode.workspace.fs.stat(uri);
                if (stat.type === vscode.FileType.File) return uri;
            } catch {
                // Missing direct files are expected; workspace search handles fallback.
            }
        }

        return undefined;
    }

    private async findCandidates(workspaceFolder: vscode.WorkspaceFolder, sourceDir: string, target: string): Promise<Candidate[]> {
        const files = await this.listMarkdownFiles();
        const normalizedTarget = normalizePath(target);
        const targetBase = stripMarkdownExtension(path.basename(normalizedTarget)).toLowerCase();
        const targetHasPath = normalizedTarget.includes('/');

        return files
            .filter(uri => {
                const relative = normalizePath(path.relative(workspaceFolder.uri.fsPath, uri.fsPath));
                if (targetHasPath) {
                    const withoutExt = stripMarkdownExtension(relative).toLowerCase();
                    return withoutExt.endsWith(stripMarkdownExtension(normalizedTarget).toLowerCase());
                }
                return stripMarkdownExtension(path.basename(uri.fsPath)).toLowerCase() === targetBase;
            })
            .map(uri => {
                const relative = normalizePath(path.relative(workspaceFolder.uri.fsPath, uri.fsPath));
                return {
                    uri,
                    label: relative,
                    description: workspaceFolder.name,
                    score: directoryDistance(sourceDir, path.dirname(uri.fsPath)) + relative.length / 10000,
                };
            })
            .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
    }

    private targetForFile(workspaceRoot: string, sourceDir: string, filePath: string): string {
        const sameDirRelative = normalizePath(path.relative(sourceDir, filePath));
        if (!sameDirRelative.startsWith('..')) return stripMarkdownExtension(sameDirRelative);
        return stripMarkdownExtension(normalizePath(path.relative(workspaceRoot, filePath)));
    }

    private revealHeading(editor: vscode.TextEditor, document: vscode.TextDocument, heading: string): void {
        const wanted = slugifyHeading(heading);
        for (let line = 0; line < document.lineCount; line += 1) {
            const text = document.lineAt(line).text;
            const match = text.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
            if (!match) continue;
            if (slugifyHeading(match[1]) !== wanted) continue;
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
            return;
        }
    }

    private revealBlock(editor: vscode.TextEditor, document: vscode.TextDocument, blockId: string): void {
        const pattern = new RegExp(`(^|\\s)\\^${escapeRegExp(blockId)}(\\s*$)`);
        for (let line = 0; line < document.lineCount; line += 1) {
            const text = document.lineAt(line).text;
            if (!pattern.test(text)) continue;
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
            return;
        }
    }
}

function normalizeTarget(target: string): string {
    return target.trim().replace(/\\/g, '/');
}

function isUnsafeTarget(target: string): boolean {
    return target.startsWith('/')
        || target.startsWith('\\')
        || path.win32.isAbsolute(target)
        || path.posix.isAbsolute(target)
        || /^file(?::|\/\/)/i.test(target)
        || target.includes('\0');
}

function hasExplicitPath(target: string): boolean {
    return normalizePath(target).includes('/');
}

function normalizePath(value: string): string {
    return value.replace(/\\/g, '/');
}

function stripMarkdownExtension(value: string): string {
    const ext = path.extname(value).toLowerCase();
    return MARKDOWN_EXTENSIONS.has(ext) ? value.slice(0, -ext.length) : value;
}

function targetHasMarkdownExtension(value: string): boolean {
    return MARKDOWN_EXTENSIONS.has(path.extname(value).toLowerCase());
}

function isIgnoredPath(value: string): boolean {
    const normalized = normalizePath(value);
    return normalized.includes('/node_modules/') || normalized.includes('/.git/') || normalized.includes('/out/');
}

function isInside(root: string, target: string): boolean {
    const relative = path.relative(root, target);
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function directoryDistance(fromDir: string, toDir: string): number {
    const fromParts = normalizePath(fromDir).split('/').filter(Boolean);
    const toParts = normalizePath(toDir).split('/').filter(Boolean);
    let common = 0;
    while (fromParts[common] && fromParts[common] === toParts[common]) common += 1;
    return (fromParts.length - common) + (toParts.length - common);
}

function slugifyHeading(value: string): string {
    return value.trim().toLowerCase()
        .replace(/[`*_~[\]()]/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
