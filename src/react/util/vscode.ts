import { isHwpEvent, validateHwpPayload } from '../../common/hwpMessageSchema';

const vscode = window['acquireVsCodeApi']?.();
const postMessage = (message) => { if (vscode) { vscode.postMessage(message) } }

const events = {}
function receive({ data }) {
    if (!data)
        return;
    if (events[data.type]) {
        if (isHwpEvent(data.type) && !validateHwpPayload(data.type, data.content)) return;
        events[data.type](data.content);
    }
}
window.addEventListener('message', receive)
const getVscodeEvent = () => {
    return {
        on(event: string, data) {
            events[event] = data
            return this;
        },
        emit(event: string, data?: any) {
            postMessage({ type: event, content: data })
        }
    }
}
export const handler = getVscodeEvent();

export function isCompose(e) {
    return e.metaKey || e.ctrlKey;
}

window.addEventListener('keydown', e => {
    if (e.code == 'F12') handler.emit('developerTool')
    else if ((isCompose(e) && e.code == 'KeyV')) e.preventDefault()  // vscode的bug, hebrew(希伯来语)键盘会粘贴两次
})
