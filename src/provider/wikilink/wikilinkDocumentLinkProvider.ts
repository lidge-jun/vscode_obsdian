import * as vscode from 'vscode';
import { findWikilinks } from '@/service/wikilink/wikilinkParser';

export class WikilinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
    provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
        return findWikilinks(document.getText()).map(link => {
            const start = document.positionAt(link.start);
            const end = document.positionAt(link.end);
            const args = encodeURIComponent(JSON.stringify([{
                sourceUri: document.uri.toString(),
                link,
            }]));
            const documentLink = new vscode.DocumentLink(
                new vscode.Range(start, end),
                vscode.Uri.parse(`command:code-office.openWikilink?${args}`)
            );
            documentLink.tooltip = `Open [[${link.raw}]]`;
            return documentLink;
        });
    }
}
