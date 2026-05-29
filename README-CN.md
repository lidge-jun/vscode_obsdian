# vscode_obsdian

[English](README.md) | 简体中文 | [한국어](README-KO.md)

`vscode_obsdian` 是一个独立的 VS Code 扩展，用于在同一个工作区中打开
Office 文档、Markdown 笔记、PDF、图片、压缩包，以及韩国 HWP/HWPX 文档。

核心亮点是 **内置 HWP/HWPX 编辑**。扩展包内包含本地 `rhwp-studio`
运行时和 WASM 引擎，常见 `.hwp` / `.hwpx` 文件无需 Hancom Office、
LibreOffice 或远程服务即可打开、编辑和保存。

本项目不隶属于 Obsidian、Hancom、Microsoft、cweijan/vscode-office、
rjwang1982/vscode-office 或 rhwp，也不代表这些项目的官方立场。

## 主要功能

- **HWP/HWPX 编辑器**：完整 rhwp 工具栏、文本编辑、表格/单元格选择、本地
  WASM 运行时、VS Code 原生保存流程。
- **Office 预览**：Word、Excel、PDF、PowerPoint、图片、字体、压缩包、
  HTTP request 文件、Registry 文件和 HTML。
- **Markdown 工作流**：基于 Vditor 的 Markdown 编辑，继承 PDF/DOCX/HTML
  导出路径。
- **离线优先 HWP 运行时**：默认使用内置 `resource/rhwp-studio`，不依赖
  外部网页。
- **清晰署名**：MIT 来源和第三方组件说明保留在 `NOTICE.md` 和 `LICENSE` 中。

## 安装

Marketplace 发布后，可通过 publisher `jun6161` 安装。也可以手动安装
Release VSIX：

```bash
code --install-extension vscode-obsdian-3.7.5.vsix
```

VS Code Insiders：

```bash
code-insiders --install-extension vscode-obsdian-3.7.5.vsix --force
```

安装后打开支持的文件，并在 VS Code 询问编辑器时选择 `vscode_obsdian`。
HWP/HWPX 文件通过专用 `cweijan.hwpEditor` custom editor 打开，以保持与继承
runtime surface 的兼容。

## 支持格式

| 格式 | 扩展名 | 模式 | 说明 |
| --- | --- | --- | --- |
| HWP / HWPX | `.hwp`, `.hwpx` | 可编辑 | 内置 rhwp-studio WASM。HWP 保存为 HWP，HWPX 保存为 HWPX。 |
| Excel | `.xls`, `.xlsx`, `.xlsm`, `.csv`, `.ods` | 预览 / 既有编辑路径 | 继承 spreadsheet viewer。 |
| Word | `.docx`, `.dotx` | 预览 | 基于 docx-preview/docxjs。 |
| PowerPoint | `.pptx` | 只读预览 | 以文本/图片预览为主，尚不承诺 PowerPoint 级完整还原。 |
| Legacy PowerPoint | `.ppt` | 可选 fallback | LibreOffice opt-in，默认关闭。 |
| PDF | `.pdf` | 预览 | 内置 PDF viewer。 |
| Markdown | `.md`, `.markdown` | 可编辑 | Vditor 编辑器，支持 PDF/DOCX/HTML 导出。 |
| 图片、字体、压缩包 | 多种扩展名 | 预览 | 继承 vscode-office 系列 viewer surface。 |

## HWP/HWPX 保存策略

HWP/HWPX 通过 VS Code editable `CustomEditorProvider` lifecycle 保存：

```text
打开文件
  -> 本地 rhwp-studio runtime
  -> 编辑
  -> Cmd/Ctrl+S 或 Save HWPX
  -> exportHwp/exportHwpx
  -> VS Code saveCustomDocument
  -> 按原格式写回文件
```

策略：

- `.hwp` 写回 HWP binary。
- `.hwpx` 写回 HWPX zip/XML package。
- 不会把 HWP bytes 静默写入 `.hwpx` 文件。
- 同格式保存不会弹出额外 Save As/overwrite 对话框。
- `vscode-obsdian.hwp.studioUrl` 是高级可信远程运行时 override，默认仍是本地 bundle。

## 设置

| 设置 | 默认值 | 用途 |
| --- | --- | --- |
| `vscode-obsdian.hwp.experimentalSave` | `true` | 显示 HWP/HWPX 工具栏保存按钮。VS Code 原生保存仍可用。 |
| `vscode-obsdian.hwp.studioUrl` | `""` | 可选可信远程 rhwp studio URL。留空则使用本地 bundle。 |
| `vscode-office.editorMode` | 继承值 | Markdown editor mode。 |
| `vscode-office.pptx.libreOfficePath` | `""` | legacy `.ppt` LibreOffice fallback 路径。 |

部分 `vscode-office.*`、`office.*`、`cweijan.*` ID 为兼容已有设置、快捷键和
custom editor association 而保留。runtime ID migration 会作为单独阶段处理。

## 发布检查

本地发布前请运行：

```bash
npm run release:local
```

该命令会依次执行 TypeScript 检查、production build、HWP hardening 校验、VSIX
打包，以及 VSIX 内容检查。它会确认扩展包包含本地 `rhwp-studio` runtime 和 WASM
资源，同时排除 upstream samples、vendor source、docs site 和开发脚本。

发布前手动 smoke test：

| 步骤 | 预期结果 |
| --- | --- |
| 安装生成的 VSIX 到 VS Code 或 VS Code Insiders。 | 扩展可激活，HWP/HWPX custom editor 可选。 |
| 打开 `.hwp` 文件并保存。 | rhwp 编辑器显示，保存后仍是 HWP。 |
| 打开 `.hwpx`，编辑文字，选择表格单元格，保存，关闭后重新打开。 | 文档仍可打开，保存后仍是 HWPX，表格/单元格交互正常。 |
| 打开 Markdown、XLSX、DOCX、PDF、PPTX、图片和压缩包样本。 | 既有 viewer/editor 路径仍可用。 |
| 检查 HWP 载入状态和保存 UI。 | 不再出现 stale loading banner 或错误的 Save As 提示循环。 |

## 限制

- rhwp 不是 Hancom Office 引擎，复杂文档可能存在 layout 或 round-trip 差异。
- 不内置 Hancom/Microsoft 专有字体，只使用开源字体和系统字体 fallback。
- PPTX 当前以只读预览为主。
- Obsidian-style wikilink 是产品方向，但不会复制完整 Obsidian。

## 来源与许可

本项目包含 MIT 许可的 `vscode-office` 系列代码：

- [cweijan/vscode-office](https://github.com/cweijan/vscode-office)，Weijan Chen 的原始项目
- [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)，RJ.Wang 维护的 fork

HWP/HWPX 编辑使用 [edwardkim/rhwp](https://github.com/edwardkim/rhwp) 的本地构建。
完整声明见 [NOTICE.md](NOTICE.md) 与 [LICENSE](LICENSE)。
