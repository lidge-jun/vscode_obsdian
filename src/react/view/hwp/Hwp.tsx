import { Spin, Alert, Button } from 'antd';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
    HWP_EVENTS,
    type HwpErrorPayload,
    type HwpFileDataPayload,
    type HwpSaveResultPayload,
} from '../../../common/hwpMessageSchema';
import { handler } from '../../util/vscode.ts';
import { getConfigs } from '../../util/vscodeConfig.ts';
import { createSecureRhwpEditor } from './rhwpBridge/createSecureRhwpEditor';
import { DEFAULT_RHWP_REQUEST_TIMEOUT_MS, type SecureRhwpEditor } from './rhwpBridge/types';
import './Hwp.less';

export default function Hwp() {
    const configs = getConfigs();
    const configuredRhwpStudioHtml = configs?.rhwpStudioHtml;
    const configuredRhwpStudioBaseUrl = configs?.rhwpStudioBaseUrl;
    const configuredRhwpStudioUrl = resolveRhwpStudioUrl(configs?.rhwpStudioUrl);
    const experimentalSave = Boolean(configs?.hwpExperimentalSave);
    const editorRef = useRef<SecureRhwpEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [isHwpx, setIsHwpx] = useState(false);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        let destroyed = false;

        handler
            .on(HWP_EVENTS.fileData, async (data: HwpFileDataPayload) => {
                if (data.error) {
                    setError(data.error);
                    setLoading(false);
                    return;
                }

                setFileName(data.fileName);
                setIsHwpx(data.isHwpx);
                setError(null);
                setWarning(null);
                setSaveMsg(null);
                setLoading(true);

                try {
                    if (!containerRef.current) {
                        setLoading(false);
                        return;
                    }
                    const studioHtml = data.studioHtml ?? configuredRhwpStudioHtml;
                    const studioBaseUrl = data.studioBaseUrl ?? configuredRhwpStudioBaseUrl;
                    const studioUrl = studioHtml ? undefined : configuredRhwpStudioUrl;
                    if (!studioHtml && !studioUrl) {
                        setError('HWP viewer is not configured: missing local rhwp-studio bundle.');
                        setLoading(false);
                        return;
                    }

                    editorRef.current?.destroy();
                    editorRef.current = null;
                    containerRef.current.replaceChildren();
                    const editor = await createSecureRhwpEditor(containerRef.current, {
                        studioUrl,
                        studioHtml,
                        studioBaseUrl,
                        width: '100%',
                        height: '100%',
                        requestTimeoutMs: DEFAULT_RHWP_REQUEST_TIMEOUT_MS,
                        onLoadStatus: (status) => {
                            if (destroyed) return;
                            if (status.status === 'loaded') {
                                setError(null);
                                setWarning(null);
                                setLoading(false);
                            } else if (status.status === 'warning') {
                                setWarning(status.message);
                                setLoading(false);
                            } else if (status.status === 'failed') {
                                setError(status.message);
                                setLoading(false);
                            }
                        },
                    });
                    if (destroyed) { editor.destroy(); return; }
                    editorRef.current = editor;

                    setLoading(false);
                    const binary = new Uint8Array(data.buffer);
                    void editor.loadFile(binary, data.fileName).catch((loadError) => {
                        if (destroyed) return;
                        setError(`Failed to load: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
                    });
                } catch (e) {
                    setError(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
                    setLoading(false);
                }
            })
            .on(HWP_EVENTS.saveResult, (result: HwpSaveResultPayload) => {
                setSaving(false);
                if (result.success) {
                    const msg = result.convertedFromHwpx
                        ? `Saved as HWP: ${result.savedPath}`
                        : 'Saved successfully';
                    setSaveMsg(msg);
                    setTimeout(() => setSaveMsg(null), 3000);
                } else {
                    setError(`Save failed: ${result.error}`);
                }
            })
            .on(HWP_EVENTS.error, (payload: HwpErrorPayload) => {
                setError(payload.error);
                setLoading(false);
            })
            .emit(HWP_EVENTS.init);

        return () => {
            destroyed = true;
            editorRef.current?.destroy();
        };
    }, [configuredRhwpStudioBaseUrl, configuredRhwpStudioHtml, configuredRhwpStudioUrl]);

    const handleSave = useCallback(async () => {
        if (!editorRef.current || saving || !experimentalSave) return;
        setSaving(true);
        try {
            const hwpBytes = await editorRef.current.exportHwp();
            const array = toNumberArray(hwpBytes);
            handler.emit(HWP_EVENTS.requestSave, { bytes: array, sourceFileName: fileName, isHwpx });
        } catch (e) {
            setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
            setSaving(false);
        }
    }, [experimentalSave, fileName, isHwpx, saving]);

    return (
        <div className="hwp-container">
            {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}
            {warning && <Alert type="warning" message={warning} closable onClose={() => setWarning(null)} />}
            {saveMsg && <Alert type="success" message={saveMsg} banner />}
            <div className="hwp-toolbar">
                <span className="hwp-filename">{fileName}</span>
                {!experimentalSave && <span className="hwp-badge">HWP/HWPX editing disabled</span>}
                {experimentalSave && isHwpx && <span className="hwp-badge">HWPX -&gt; saves as HWP</span>}
                {loading && (
                    <span className="hwp-status" role="status" aria-live="polite">
                        <Spin size="small" />
                        Loading HWP
                    </span>
                )}
                {experimentalSave && (
                    <Button
                        type="primary"
                        size="small"
                        onClick={handleSave}
                        loading={saving}
                    >
                        Save HWP
                    </Button>
                )}
            </div>
            <div ref={containerRef} className="hwp-editor" />
        </div>
    );
}

function toNumberArray(value: ArrayBuffer | Uint8Array | number[]): number[] {
    if (Array.isArray(value)) return value;
    if (value instanceof Uint8Array) return Array.from(value);
    return Array.from(new Uint8Array(value));
}

function resolveRhwpStudioUrl(configuredUrl?: string): string | undefined {
    if (configuredUrl) return configuredUrl;

    const baseHref = document.querySelector('base')?.href;
    if (!baseHref) return undefined;

    try {
        const baseUrl = new URL(baseHref);
        const isVsCodeResource = baseUrl.protocol.startsWith('vscode-webview')
            || baseUrl.hostname.endsWith('vscode-cdn.net');
        if (!isVsCodeResource) return undefined;

        return new URL('../../resource/rhwp-studio/index.html', baseUrl).toString();
    } catch {
        return undefined;
    }
}
