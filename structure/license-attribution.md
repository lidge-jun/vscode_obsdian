# License And Attribution Strategy

## Current State

The imported source currently includes an MIT `LICENSE` file with:

```text
Copyright (c) 2020 Weijan Chen
```

The current README also credits:

- cweijan / original `vscode-office`
- RJ.Wang / maintained fork of `cweijan/vscode-office`
- Vanessa219 / Vditor
- PDF.js, docxjs, SheetJS, x-spreadsheet, Rest Client, Mermaid

Phase 1 keeps `LICENSE`, adds `NOTICE.md`, and rewrites README/README-CN so the product is not visually branded as a GitHub fork while attribution remains visible.

## Policy

새 GitHub repository로 가더라도 원본이 MIT이면 코드 복사, 수정, 배포 자체는 가능하지만 copyright notice, permission notice, disclaimer를 보존해야 합니다.

> 출처: [MIT Copyright Notice](https://web.mit.edu/ivlib/www/copyright.html)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## Recommended Files

Phase 1 added or updated:

```text
LICENSE
NOTICE.md
README.md
README-CN.md
package.json
```

Current `NOTICE.md` outline:

```text
vscode_obsdian

This project contains code derived from:
- cweijan/vscode-office
- rjwang1982/vscode-office, a maintained fork of cweijan/vscode-office

The original code is licensed under the MIT License.
Original copyright notices are preserved in LICENSE and source files.

Additional bundled third-party components include:
- Vditor
- pdf.js
- docx-preview/docxjs
- SheetJS/xlsx
- x-spreadsheet
- Mermaid
- Rest Client-derived HTTP tooling
```

## README Language

Allowed:

```text
vscode_obsdian is based on MIT-licensed vscode-office code. Original copyright and license notices are preserved.

Original lineage:
- cweijan/vscode-office
- rjwang1982/vscode-office, maintained fork of cweijan/vscode-office
```

Avoid:

```text
Forked project
Official continuation
Original author maintained
```

Reason: the product should not visually brand itself as a GitHub fork, but the legal provenance should remain visible.

## Package Metadata

Current release metadata has been updated:

- `name`
- `displayName`
- `description`
- `publisher`
- `bugs` removed until a real new repository URL exists
- `homepage` removed until a real new repository URL exists
- `repository` removed until a real new repository URL exists
- `keywords`
- configuration title

Future compatibility migration should separately decide:

- command category labels
- configuration prefix
- custom viewType IDs

Do not use placeholder repository URLs. If the new upstream repo URL is unknown, leave repository metadata unset until the real URL exists.

## Current Release Decisions

1. Public package name is `vscode-obsdian`; display name remains `vscode_obsdian`.
2. Publisher ID is `lidge-jun` in `package.json`.
3. Runtime `vscode-office.*` settings and `cweijan.*` viewTypes are intentionally retained as legacy compatibility surfaces until a separate migration/alias decision exists.
4. `README-CN.md` is retained and rewritten for now.
