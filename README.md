# vscode_obsdian

English | [简体中文](README-CN.md)

`vscode_obsdian` is a VS Code extension for reading Office documents and Markdown notes in one workspace. It starts from the MIT-licensed `vscode-office` code line and keeps the original license notices while moving toward Obsidian-style note navigation.

This project is not affiliated with or endorsed by Obsidian, cweijan/vscode-office, or rjwang1982/vscode-office.

## Current Scope

The imported viewer currently supports these file types:

- Excel: `.xls`, `.xlsx`, `.csv`, `.ods`
- Word: `.docx`, `.dotx`
- PDF: `.pdf`
- SVG: `.svg`
- Images: `.jpg`, `.png`, `.gif`, `.webp`, `.tif`, `.ico`, and related formats
- Fonts: `.ttf`, `.otf`, `.woff`, `.woff2`
- Markdown: `.md`, `.markdown`
- HTTP request files: `.http`, `.rest`
- Windows Registry files: `.reg`
- Archives and packages: `.zip`, `.jar`, `.vsix`, `.rar`, `.apk`
- HTML preview: `.html`, `.htm`

Markdown editing is powered by Vditor. Export to PDF, DOCX, and HTML follows the existing `vscode-office` export path; PDF export requires Chromium and still uses the legacy `vscode-office.chromiumPath` setting.

## Roadmap

The near-term roadmap is:

1. Rebrand and attribution cleanup
2. Obsidian-style wikilinks with closest-note resolution
3. Wikilink WebView/export integration
4. PPTX read-only text/image preview stabilization
5. Markdown CJK inline formatting and strikethrough fixes
6. Excel strikethrough/style preservation
7. Optional LibreOffice fallback completion for complex or legacy presentations

The current working tree already exposes an experimental `*.pptx` selector and LibreOffice fallback configuration. The roadmap items above track stabilization and verification of those surfaces, not a claim that the public manifest is still rebrand-only.

Wikilink behavior will be implemented as a workspace-safe resolver. For `[[Note]]`, the extension should prefer the closest matching Markdown note from the current file context, then fall back to the shortest unique workspace path. Ambiguous matches should be surfaced instead of guessed.

Markdown rendering fixes are prioritized around CJK text mixed with Markdown markers, especially cases like Korean text, tables, `~~strike~~`, and `**bold**` appearing together. Excel strikethrough remains useful, but it is secondary to the Markdown editor issue shown in current QA.

## Compatibility Note

Some internal identifiers intentionally remain unchanged for now:

- command IDs such as `office.markdown.switch`
- HTTP helper IDs such as `vscode-office.request`
- configuration keys such as `vscode-office.editorMode`
- custom editor viewTypes such as `cweijan.markdownViewer`

Those IDs are part of the runtime integration surface. They will be migrated only after a compatibility plan exists, because changing them all at once can break existing settings, keybindings, and custom editor associations.

## Attribution

`vscode_obsdian` contains code derived from:

- [cweijan/vscode-office](https://github.com/cweijan/vscode-office), the original `vscode-office` project by Weijan Chen
- [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office), a maintained fork by RJ.Wang

The original MIT copyright and license notices are preserved in [LICENSE](LICENSE). Additional attribution is recorded in [NOTICE.md](NOTICE.md).

## Third-Party Credits

- Markdown editor: [Vditor](https://github.com/Vanessa219/vditor)
- PDF rendering: [mozilla/pdf.js](https://github.com/mozilla/pdf.js)
- DOCX rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- XLSX parsing: [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs)
- XLSX style preservation: [gitbrent/xlsx-js-style](https://github.com/gitbrent/xlsx-js-style)
- Spreadsheet rendering: [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet)
- HTTP request tooling: [Huachao/vscode-restclient](https://github.com/Huachao/vscode-restclient)
- Diagrams: [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
