import * as vscode from 'vscode';
import { WikilinkResolver } from '@/service/wikilink/wikilinkResolver';

export class WikilinkCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private resolver: WikilinkResolver) {}

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const context = getActiveWikilinkContext(document, position);
        if (!context) return [];

        const targets = await this.resolver.completionTargets(document.uri);
        return targets.map(target => {
            const item = new vscode.CompletionItem(target, vscode.CompletionItemKind.File);
            item.range = context.range;
            item.insertText = context.needsClosingBrackets ? `${target}]]` : target;
            item.detail = 'vscode_obsdian wikilink';
            return item;
        });
    }
}

function getActiveWikilinkContext(document: vscode.TextDocument, position: vscode.Position): { range: vscode.Range; needsClosingBrackets: boolean } | undefined {
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.slice(0, position.character);
    const openIndex = beforeCursor.lastIndexOf('[[');
    if (openIndex === -1) return undefined;

    const closeIndex = beforeCursor.lastIndexOf(']]');
    if (closeIndex > openIndex) return undefined;

    const afterCursor = line.slice(position.character);
    const start = new vscode.Position(position.line, openIndex + 2);
    return {
        range: new vscode.Range(start, position),
        needsClosingBrackets: !afterCursor.startsWith(']]'),
    };
}
