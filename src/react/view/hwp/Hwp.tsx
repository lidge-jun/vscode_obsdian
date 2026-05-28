import { Spin, Alert, Button } from 'antd';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createEditor } from '@rhwp/editor';
import type { RhwpEditor } from '@rhwp/editor';
import { handler } from '../../util/vscode.ts';
import './Hwp.less';

interface HwpPayload {
    fileName: string;
    buffer: number[];
    fileSize: number;
    isHwpx: boolean;
    error?: string;
}

interface SaveResult {
    success: boolean;
    savedPath?: string;
    convertedFromHwpx?: boolean;
    error?: string;
}

export default function Hwp() {
    const editorRef = useRef<RhwpEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [isHwpx, setIsHwpx] = useState(false);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        let destroyed = false;

        handler
            .on('hwpData', async (data: HwpPayload) => {
                if (data.error) {
                    setError(data.error);
                    setLoading(false);
                    return;
                }

                setFileName(data.fileName);
                setIsHwpx(data.isHwpx);

                try {
                    if (!containerRef.current) return;
                    const editor = await createEditor(containerRef.current, {
                        width: '100%',
                        height: '100%',
                    });
                    if (destroyed) { editor.destroy(); return; }
                    editorRef.current = editor;

                    const binary = new Uint8Array(data.buffer);
                    await editor.loadFile(binary, data.fileName);
                    setLoading(false);
                } catch (e) {
                    setError(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
                    setLoading(false);
                }
            })
            .on('hwpSaved', (result: SaveResult) => {
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
            .emit('init');

        return () => {
            destroyed = true;
            editorRef.current?.destroy();
        };
    }, []);

    const handleSave = useCallback(async () => {
        if (!editorRef.current || saving) return;
        setSaving(true);
        try {
            const hwpBytes = await editorRef.current.exportHwp();
            const array = [...new Uint8Array(hwpBytes)];
            handler.emit('saveHwp', array);
        } catch (e) {
            setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
            setSaving(false);
        }
    }, [saving]);

    return (
        <div className="hwp-container">
            {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}
            {saveMsg && <Alert type="success" message={saveMsg} banner />}
            <div className="hwp-toolbar">
                <span className="hwp-filename">{fileName}</span>
                {isHwpx && <span className="hwp-badge">HWPX → saves as HWP</span>}
                <Button
                    type="primary"
                    size="small"
                    onClick={handleSave}
                    loading={saving}
                >
                    Save HWP
                </Button>
            </div>
            {loading && <Spin spinning fullscreen />}
            <div ref={containerRef} className="hwp-editor" />
        </div>
    );
}
