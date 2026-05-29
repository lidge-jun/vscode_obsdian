# vscode_obsdian

English | [简体中文](README-CN.md) | [한국어](README-KO.md)

`vscode_obsdian` is an independent VS Code extension for opening Office files,
Markdown notes, archives, PDFs, images, and Korean HWP/HWPX documents directly
inside one workspace.

Project homepage: <https://lidge-jun.github.io/vscode_obsdian/>

The main differentiator is bundled **HWP/HWPX editing**. The extension ships a
local `rhwp-studio` runtime, so common `.hwp` and `.hwpx` files can be opened,
edited, and saved without Hancom Office, LibreOffice, or a remote service.

This project is not affiliated with or endorsed by Obsidian, Hancom, Microsoft,
cweijan/vscode-office, rjwang1982/vscode-office, or rhwp.

## Highlights

- **HWP/HWPX editor**: full rhwp toolbar, text editing, table/cell selection,
  local WASM runtime, VS Code native save lifecycle.
- **Office preview**: Word, Excel, PDF, PowerPoint preview, images, fonts,
  archives, HTTP request files, registry files, and HTML.
- **Markdown workspace**: Vditor-based Markdown editing with export paths for
  PDF, DOCX, and HTML.
- **Offline-first HWP runtime**: the default HWP path uses the bundled
  `resource/rhwp-studio` assets generated from the pinned rhwp build.
- **Clear attribution**: MIT lineage and third-party runtime credits are kept in
  [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE).

## Install

Install from the VS Code Marketplace when published under publisher
`jun6161`, or install a release VSIX manually:

```bash
code --install-extension vscode-obsdian-3.7.5.vsix
```

For VS Code Insiders:

```bash
code-insiders --install-extension vscode-obsdian-3.7.5.vsix --force
```

After installation, open a supported file and choose `vscode_obsdian` when VS
Code asks for an editor. HWP/HWPX files are registered through the dedicated
`cweijan.hwpEditor` custom editor for compatibility with the inherited runtime
surface.

## Supported Formats

| Format | Extensions | Mode | Notes |
| --- | --- | --- | --- |
| HWP / HWPX | `.hwp`, `.hwpx` | Editable | Bundled local rhwp-studio WASM runtime. Saves HWP as HWP and HWPX as HWPX. |
| Excel / Spreadsheet | `.xls`, `.xlsx`, `.xlsm`, `.csv`, `.ods` | Preview / existing edit paths | Uses the inherited spreadsheet viewer stack. |
| Word | `.docx`, `.dotx` | Preview | Uses docx-preview/docxjs-derived rendering. |
| PowerPoint | `.pptx` | Read-only preview | Text/media preview; complex layout fidelity is not yet PowerPoint-level. |
| Legacy PowerPoint | `.ppt` | Optional fallback | LibreOffice conversion is opt-in and disabled by default. |
| PDF | `.pdf` | Preview | Bundled PDF viewer. |
| Markdown | `.md`, `.markdown` | Editable | Vditor editor, export to PDF/DOCX/HTML through inherited paths. |
| Images | `.jpg`, `.png`, `.gif`, `.webp`, `.tif`, `.ico`, `.svg` | Preview | Image and SVG preview surfaces. |
| Fonts | `.ttf`, `.otf`, `.woff`, `.woff2` | Preview | Font viewer. |
| Archives | `.zip`, `.jar`, `.vsix`, `.rar`, `.apk` | Preview / extract | Zip/RAR package browsing. |
| HTTP / REST | `.http`, `.rest` | Tooling | Inherited Rest Client-derived helpers. |
| Windows Registry | `.reg` | Preview / navigation | Registry syntax and jump helper. |
| HTML | `.html`, `.htm` | Preview | WebView HTML preview. |

## HWP/HWPX Editing

HWP support is powered by a pinned local build of
[edwardkim/rhwp](https://github.com/edwardkim/rhwp), vendored as
`vendor/rhwp-studio-dist` and copied into `resource/rhwp-studio` during build.

The VS Code integration uses a dedicated editable `CustomEditorProvider`:

```text
HWP/HWPX file
  -> HwpEditorProvider
  -> React HWP view
  -> local rhwp-studio bridge
  -> rhwp WASM document engine
  -> exportHwp/exportHwpx
  -> VS Code saveCustomDocument
```

What works today:

- Open `.hwp` and `.hwpx` files with the full rhwp editor toolbar.
- Edit text and use rhwp table/cell selection features.
- Save with `Cmd+S` / `Ctrl+S` or the toolbar button.
- Preserve the destination format: `.hwp` writes HWP bytes, `.hwpx` writes HWPX
  bytes.
- Use the bundled local runtime by default without network access.

Known limits:

- rhwp is not Hancom Office. Very complex HWP/HWPX documents may still have
  layout or round-trip differences.
- Bundled open fonts are used as fallbacks. Proprietary Hancom or Microsoft
  fonts are not bundled.
- Optional `vscode-obsdian.hwp.studioUrl` is an advanced trusted remote runtime
  override; the default remains local.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `vscode-obsdian.hwp.experimentalSave` | `true` | Shows the HWP/HWPX toolbar save button. VS Code native save still works for dirty custom editor documents. |
| `vscode-obsdian.hwp.studioUrl` | `""` | Optional trusted remote rhwp studio URL. Leave empty for the bundled local runtime. |
| `vscode-office.editorMode` | inherited | Markdown editor mode from the upstream runtime surface. |
| `vscode-office.pptx.libreOfficePath` | `""` | Optional LibreOffice executable path for legacy `.ppt` fallback. |
| `vscode-office.pptx.conversionTimeoutMs` | `30000` | Timeout for optional LibreOffice conversion. |

Some `vscode-office.*`, `office.*`, and `cweijan.*` identifiers intentionally
remain for compatibility with existing settings, commands, and custom editor
associations. Runtime ID migration is tracked as a separate compatibility task.

## Release Checks

For local release verification:

```bash
npm run release:local
```

The release gate runs type checks, builds the WebView and extension host,
verifies HWP hardening assumptions, packages the VSIX, and checks that the VSIX
contains the bundled rhwp runtime while excluding samples and vendor sources.

Manual smoke before publishing:

```text
1. Install the generated VSIX in VS Code or VS Code Insiders.
2. Open a .hwp file and save it.
3. Open a .hwpx file, edit text, select table cells, save, close, and reopen.
4. Open Markdown, XLSX, DOCX, PDF, PPTX, image, and archive samples.
5. Confirm no stale HWP loading banner or false Save As prompt remains.
```

## Roadmap

- Obsidian-style `[[wikilink]]` completion, navigation, and WebView/export
  integration.
- PPTX preview stabilization beyond text/media extraction.
- Markdown CJK inline formatting and strikethrough polish.
- Excel strikethrough/style preservation.
- Optional LibreOffice fallback completion for complex legacy presentations.
- Continued HWP/HWPX hardening and fixture-based smoke tests.

See [structure/roadmap.md](structure/roadmap.md) for the internal phase record.

## Attribution

`vscode_obsdian` contains code derived from MIT-licensed `vscode-office` work:

- [cweijan/vscode-office](https://github.com/cweijan/vscode-office), original
  project by Weijan Chen
- [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office), a
  maintained fork by RJ.Wang

HWP/HWPX editing uses a local build of
[edwardkim/rhwp](https://github.com/edwardkim/rhwp). Bundled fonts and document
runtime components remain subject to their own licenses.

Full notices are in [NOTICE.md](NOTICE.md). The original MIT license text is
preserved in [LICENSE](LICENSE).
