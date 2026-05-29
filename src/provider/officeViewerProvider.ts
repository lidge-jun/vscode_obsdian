import { ReactApp } from '@/common/reactApp';
import { readFileSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { handleImage, isImage } from './handlers/imageHandler';
import { handleZip } from './compress/zipHandler';
import { handleRar } from './compress/rarHandler';
import { handleCommonEvent } from './compress/commonHandler';
import { handlePptx } from './handlers/pptxHandler';
import { handleHwp } from './handlers/hwpHandler';

const DEFAULT_RHWP_STUDIO_URL = 'https://edwardkim.github.io/rhwp/';

/**
 * support view office files
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {

    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
        const viewers = ['cweijan.officeViewer', 'cweijan.imageViewer', 'cweijan.htmlViewer']
        return viewers.map(viewer => vscode.window.registerCustomEditorProvider(viewer, this, viewOption))
    }

    public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
        return { uri, dispose: (): void => { } };
    }
    public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        const rhwpStudioRoot = vscode.Uri.file(`${this.extensionPath}/resource/rhwp-studio`)
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(this.extensionPath),
                rhwpStudioRoot,
                folderPath,
                this.context.globalStorageUri
            ]
        }

        const handler = Handler.bind(webviewPanel, uri)
        handleCommonEvent(uri, handler)

        let route: string;
        let hwpExperimentalSave: boolean | undefined;
        let rhwpStudioUrl: string | undefined;
        const ext = extname(uri.fsPath).toLowerCase()
        if (isImage(ext)) {
            handleImage(handler, uri, webview)
            route = 'image'
        }
        switch (ext) {
            case ".xlsx":
            case ".xlsm":
            case ".xls":
            case ".csv":
            case ".ods":
                route = 'excel';
                break;
            case ".docx":
            case ".dotx":
                route = 'word'
                break;
            case ".hwp":
            case ".hwpx":
                route = 'hwp';
                hwpExperimentalSave = vscode.workspace
                    .getConfiguration('vscode-obsdian')
                    .get<boolean>('hwp.experimentalSave', true);
                rhwpStudioUrl = vscode.workspace
                    .getConfiguration('vscode-obsdian')
                    .get<string>('hwp.studioUrl', DEFAULT_RHWP_STUDIO_URL);
                handleHwp(uri, handler);
                break;
            case ".pptx":
                route = 'pptx';
                handlePptx(uri, handler);
                break;
            case ".jar":
            case ".zip":
            case ".apk":
            case ".vsix":
                route = 'zip';
                handleZip(uri, handler);
                break;
            case ".rar":
                route = 'zip';
                handleRar(uri, handler);
                break;
            case ".ttf":
            case ".woff":
            case ".woff2":
            case ".otf":
                route = 'font';
                break;
            case ".pdf":
                webview.html = readFileSync(this.extensionPath + "/resource/pdf/viewer.html", 'utf8')
                    .replace("{{baseUrl}}", this.getBaseUrl(webview, 'pdf'))
                break;
            case ".htm":
            case ".html":
                webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webview, folderPath.fsPath);
                Util.listen(webviewPanel, uri, () => {
                    webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
                })
                break;
            default:
                if (route) break;
                vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }
        if (route === 'hwp') {
            return ReactApp.view(webview, {
                route,
                rhwpStudioUrl,
                hwpExperimentalSave,
            })
        }
        if (route) return ReactApp.view(webview, { route })
    }

    private buildRhwpStudioHtml(rootPath: string): string {
        const indexHtml = readFileSync(`${rootPath}/index.html`, 'utf8')
            .replace(
                /<link rel="manifest" href="\.?\/manifest\.webmanifest"><script id="vite-plugin-pwa:register-sw" src="\.?\/registerSW\.js"><\/script>/,
                ''
            )
            .replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*/g, '');
        const cssPath = matchRequired(indexHtml, /<link rel="stylesheet"[^>]+href="\.\/([^"]+\.css)"[^>]*>/);
        const scriptPath = matchRequired(indexHtml, /<script type="module"[^>]+src="\.\/([^"]+\.js)"[^>]*><\/script>/);
        const css = this.inlineRhwpCss(rootPath, cssPath);
        const script = this.inlineRhwpScript(rootPath, scriptPath);

        return indexHtml
            .replace(/<link rel="stylesheet"[^>]+href="\.\/[^"]+\.css"[^>]*>/, `<style>${escapeStyleContent(css)}</style>`)
            .replace(/<script type="module"[^>]+src="\.\/[^"]+\.js"[^>]*><\/script>/, `<script type="module">${escapeScriptContent(script)}</script>`);
    }

    private inlineRhwpCss(rootPath: string, cssPath: string): string {
        const cssRoot = cssPath.split('/').slice(0, -1).join('/');
        return readFileSync(`${rootPath}/${cssPath}`, 'utf8')
            .replace(/url\((['"]?)\.\.\/images\/([^)'"]+)\1\)/g, (_match, _quote: string, imageName: string) => {
                const imagePath = `${rootPath}/${cssRoot}/../images/${imageName}`;
                const image = readFileSync(imagePath, 'utf8');
                return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}")`;
            });
    }

    private inlineRhwpScript(rootPath: string, scriptPath: string): string {
        let script = readFileSync(`${rootPath}/${scriptPath}`, 'utf8');
        script = script.replace(
            /new URL\(`\/assets\/([^`]+\.wasm)`,``\+import\.meta\.url\)/g,
            (_match, wasmFileName: string) => JSON.stringify(toWasmDataUri(`${rootPath}/assets/${wasmFileName}`)),
        );
        if (script.includes('`/assets/')) {
            throw new Error('Failed to rewrite absolute rhwp-studio asset URL');
        }
        return script;
    }

    private getBaseUrl(webview: vscode.Webview, path: string) {
        const baseUrl = webview.asWebviewUri(vscode.Uri.file(`${this.extensionPath}/resource/${path}`))
            .toString().replace(/\?.+$/, '').replace('https://git', 'https://file')
        return baseUrl;
    }

}

function matchRequired(value: string, pattern: RegExp): string {
    const match = value.match(pattern);
    if (!match?.[1]) throw new Error(`Missing rhwp-studio asset matching ${pattern.source}`);
    return match[1];
}

function toWasmDataUri(filePath: string): string {
    const wasm = readFileSync(filePath);
    return `data:application/wasm;base64,${wasm.toString('base64')}`;
}

function escapeStyleContent(value: string): string {
    return value.replace(/<\/style/gi, '<\\/style');
}

function escapeScriptContent(value: string): string {
    return value.replace(/<\/script/gi, '<\\/script');
}
