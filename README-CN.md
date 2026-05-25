# vscode_obsdian

[English](README.md) | 简体中文

`vscode_obsdian` 是一个在 VS Code 中阅读 Office 文档和 Markdown 笔记的扩展。它基于 MIT 许可的 `vscode-office` 代码谱系，并保留原始版权和许可声明，同时向 Obsidian 风格的笔记导航体验演进。

本项目与 Obsidian、cweijan/vscode-office 或 rjwang1982/vscode-office 均无从属关系，也未获得其官方背书。

## 当前范围

当前导入的查看器支持以下文件类型：

- Excel：`.xls`、`.xlsx`、`.csv`、`.ods`
- Word：`.docx`、`.dotx`
- PDF：`.pdf`
- SVG：`.svg`
- 图片：`.jpg`、`.png`、`.gif`、`.webp`、`.tif`、`.ico` 等
- 字体：`.ttf`、`.otf`、`.woff`、`.woff2`
- Markdown：`.md`、`.markdown`
- HTTP 请求文件：`.http`、`.rest`
- Windows 注册表文件：`.reg`
- 压缩包和扩展包：`.zip`、`.jar`、`.vsix`、`.rar`、`.apk`
- HTML 预览：`.html`、`.htm`

Markdown 编辑器由 Vditor 提供。PDF、DOCX、HTML 导出仍沿用现有 `vscode-office` 导出路径；PDF 导出依赖 Chromium，并暂时继续使用旧的 `vscode-office.chromiumPath` 配置项。

## 路线图

近期路线图如下：

1. 品牌重命名与 attribution 清理
2. Obsidian 风格 wikilink，并按最接近的笔记解析
3. Wikilink WebView/export 集成
4. PPTX 只读文本/图片预览稳定化
5. Markdown CJK 内联格式和删除线修复
6. Excel 删除线和样式保留
7. 面向复杂或旧版演示文稿的可选 LibreOffice fallback 完成与验证

当前工作树已经暴露实验性的 `*.pptx` selector 和 LibreOffice fallback 配置。上面的路线图表示这些表面的稳定化和验证，并不是说当前 manifest 仍停留在纯 rebrand 阶段。

`[[Note]]` 解析会优先从当前文件上下文寻找最接近的 Markdown 笔记，再退回到工作区内最短且唯一的路径。若存在多个候选，扩展应提示用户选择，而不是静默猜测。

Markdown 修复的优先级放在 CJK 文本与 Markdown 标记混合的渲染问题上，尤其是韩文、表格、`~~strike~~`、`**bold**` 同时出现的场景。Excel 删除线仍然有价值，但它排在当前 Markdown 编辑器问题之后。

## 兼容性说明

部分内部标识当前会暂时保留：

- 命令 ID，例如 `office.markdown.switch`
- HTTP 辅助命令，例如 `vscode-office.request`
- 配置项，例如 `vscode-office.editorMode`
- 自定义编辑器 viewType，例如 `cweijan.markdownViewer`

这些标识属于运行时集成面。只有在兼容迁移方案明确之后，才会统一迁移，避免破坏现有设置、快捷键和自定义编辑器关联。

## Attribution

`vscode_obsdian` 包含来自以下项目的代码：

- [cweijan/vscode-office](https://github.com/cweijan/vscode-office)，Weijan Chen 创建的原始 `vscode-office` 项目
- [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)，RJ.Wang 维护的 fork

原始 MIT 版权和许可声明保留在 [LICENSE](LICENSE) 中。更多 attribution 记录在 [NOTICE.md](NOTICE.md)。

## Third-Party Credits

- Markdown editor: [Vditor](https://github.com/Vanessa219/vditor)
- PDF rendering: [mozilla/pdf.js](https://github.com/mozilla/pdf.js)
- DOCX rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- XLSX parsing: [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs)
- XLSX style preservation: [gitbrent/xlsx-js-style](https://github.com/gitbrent/xlsx-js-style)
- Spreadsheet rendering: [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet)
- HTTP request tooling: [Huachao/vscode-restclient](https://github.com/Huachao/vscode-restclient)
- Diagrams: [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
