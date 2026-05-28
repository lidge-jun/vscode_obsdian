import * as http from 'http';
import * as fs from 'fs';
import * as vscode from 'vscode';

interface ViewOption {
    route: string;
    rhwpStudioUrl?: string;
    hwpExperimentalSave?: boolean;
}

export class ReactApp {

    private static webviewPath: string;
    public static IS_DEV = false;
    public static init(context: vscode.ExtensionContext) {
        this.webviewPath = context.extensionPath + '/out/webview'
        this.IS_DEV = context.extensionMode == vscode.ExtensionMode.Development
    }

    public static async view(webview: vscode.Webview, option: ViewOption) {
        const html = await this.readContent()
        webview.html = this.injectCsp(this.buildPath(html, webview), webview)
            .replace(`{{configs}}`, JSON.stringify({
                ...option,
                language: vscode.env.language,
                config: vscode.workspace.getConfiguration('vscode-office')
            }))
    }

    private static async readContent(): Promise<string> {
        if (this.IS_DEV) {
            const data = await new Promise<string>((resolve, reject) => {
                http.get('http://127.0.0.1:5739/index.html', (res) => {
                    let body = '';
                    res.on('data', (chunk) => body += chunk);
                    res.on('end', () => resolve(body));
                    res.on('error', reject);
                }).on('error', reject);
            });
            return data.replace('/@vite/client', 'http://127.0.0.1:5739/@vite/client')
        }
        const targetPath = `${this.webviewPath}/index.html`;
        return fs.readFileSync(targetPath, 'utf8')
    }

    private static buildPath(data: string, webview: vscode.Webview): string {
        const baseUrl = ReactApp.getBaseUrl(webview);
        return data.replace('<base href="/">', `<base href="${baseUrl}/">`);
    }

    private static injectCsp(data: string, webview: vscode.Webview): string {
        const csp = this.IS_DEV
            ? [
                "default-src 'none'",
                `img-src http://127.0.0.1:5739 ${webview.cspSource} data: blob:`,
                `font-src http://127.0.0.1:5739 ${webview.cspSource} data:`,
                `style-src http://127.0.0.1:5739 ${webview.cspSource} 'unsafe-inline'`,
                `script-src http://127.0.0.1:5739 ${webview.cspSource} 'unsafe-eval'`,
                `connect-src http://127.0.0.1:5739 ws://127.0.0.1:5739 ${webview.cspSource}`,
                `frame-src http://127.0.0.1:5739 ${webview.cspSource}`,
                `worker-src http://127.0.0.1:5739 ${webview.cspSource} blob:`,
            ].join('; ')
            : [
                "default-src 'none'",
                `img-src ${webview.cspSource} data: blob:`,
                `font-src ${webview.cspSource} data:`,
                `style-src ${webview.cspSource} 'unsafe-inline'`,
                `script-src ${webview.cspSource} 'wasm-unsafe-eval'`,
                `connect-src ${webview.cspSource}`,
                `frame-src ${webview.cspSource}`,
                `worker-src ${webview.cspSource} blob:`,
            ].join('; ');
        return data.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`);
    }

    private static getBaseUrl(webview: vscode.Webview) {
        if (this.IS_DEV) {
            return `http://127.0.0.1:5739`;
        }
        return webview.asWebviewUri(vscode.Uri.file(this.webviewPath)).toString();
    }

}
