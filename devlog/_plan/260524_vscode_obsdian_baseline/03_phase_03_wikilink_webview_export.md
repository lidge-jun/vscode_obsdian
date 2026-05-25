# 03 Phase 03 — Wikilink WebView And Export

## Goal

Phase 2가 VS Code editor의 completion/document-link resolver라면, Phase 3는 Vditor WebView와 export pipeline에 같은 wikilink parser/resolver 정책을 연결한다.

## Why This Is Separate

WebView 내부에서 직접 `file://`을 열거나 workspace path를 신뢰하면 보안 경계가 깨질 수 있다. 따라서 Vditor는 링크 표시와 click event만 담당하고, 실제 resolve/open은 extension host가 처리해야 한다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Likely Touch Points

```text
src/provider/markdownEditorProvider.ts
src/common/handler.ts
resource/vditor/index.js
resource/vditor/util.js
src/service/markdown/markdown-pdf.js
src/service/wikilink/wikilinkHtml.ts
```

## Expected Behavior

- Vditor preview에서 `[[Note]]`가 내부 링크처럼 보임
- click 시 WebView가 extension host로 target body만 전달
- extension host가 Phase 2 resolver를 재사용해 closest-note 또는 suggestion을 처리
- HTML/PDF export에서는 raw `[[Note]]`가 그대로 깨져 보이지 않도록 export-safe output으로 변환
- export output에는 VS Code `command:` URI를 넣지 않음

## Out Of Scope

- hover preview
- backlinks panel
- graph view
- missing note auto-create
- block reference embed

## Done Criteria

- Vditor preview click opens the same target as editor document link
- ambiguous same-name notes do not silently open a random file
- export path has documented behavior for wikilinks
- external Markdown links keep working
- build passes
