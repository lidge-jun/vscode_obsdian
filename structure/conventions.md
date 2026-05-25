# Conventions

## Current Observed Conventions

이 프로젝트는 기존 `vscode-office-enhanced` 코드베이스를 가져온 뒤 public identity를 `vscode_obsdian`으로 바꿔 가는 상태입니다. 현재 컨벤션은 “VS Code extension host 쪽 TypeScript + React WebView + Vditor resource bundle” 조합입니다.

## Language And Module Shape

Observed:

- extension host files use `.ts`
- React views use `.tsx`
- some bundled/vendor files use `.js`
- root build output is CommonJS through `tsconfig.json` and `build.ts`
- React build uses Vite and ES module style

Decision for future new source files:

- New extension-host logic should use `.ts`.
- New React views should use `.tsx`.
- New plain WebView helpers under `resource/vditor/` may stay `.js` because that area is already direct browser JavaScript.
- Do not convert existing CommonJS build wiring during feature phases unless there is a dedicated build-system phase.

## Naming

Original upstream identity:

- `vscode-office-enhanced`
- `Office Viewer Enhanced`

Current public identity:

- package name: `vscode-obsdian`
- display name: `vscode_obsdian`
- publisher: `lidge-jun`

Legacy runtime identity still present:

- `vscode-office.*` settings
- `office.*` commands
- `vscode-office.*` HTTP commands
- `cweijan.*` view types

Future migration proposal:

- settings prefix: `vscode-obsdian.*`
- command prefix: `vscode-obsdian.*`
- view type prefix: `vscode-obsdian.*`

The repository/folder spelling currently remains `vscode_obsdian`. Runtime prefix migration should be done separately because settings, command IDs, and custom editor associations are observable integration points.

## Documentation

New source-of-truth docs:

```text
structure/
  README.md
  architecture.md
  conventions.md
  research.md
  risks.md
  license-attribution.md

devlog/
  _plan/
    260524_vscode_obsdian_baseline/
      00_overview.md
      01_phase_01_rebrand_and_attribution.md
      02_phase_02_obsidian_closest_wikilinks.md
      03_phase_03_wikilink_webview_export.md
      04_phase_04_pptx_support.md
      05_phase_05_markdown_cjk_inline_formatting.md
      06_phase_06_excel_strikethrough_preservation.md
      07_phase_07_libreoffice_fallback.md
      90_research_grok_expert.md
      97_baseline_import_snapshot.md
  _fin/
  str_func/
```

Plan documents use numeric prefixes. Do not create bare `PLAN.md`, `plan.md`, `DIFF_PLAN.md`, `PHASES.md`, or `RCA.md`.

## Git And Repository State

Current import state:

- local path: `/Users/jun/Developer/new/700_projects/vscode_obsdian`
- cloned source: `https://github.com/rjwang1982/vscode-office`
- original upstream lineage: `https://github.com/cweijan/vscode-office`
- current remote: `origin` still points at the source repository
- no commit/push was made
- package metadata no longer points homepage/bugs/repository at upstream

Future new-repo step:

1. Choose the final GitHub repository name.
2. Decide whether to remove or rename `origin`.
3. Add new remote only after user approval.
4. Preserve MIT license and original copyright notice.

## Verification Convention

Docs-only verification:

- `git status --short`
- `find structure devlog -type f`
- `node` JSON parse check when `package.json` changes
- build can be skipped for README/NOTICE-only edits, but package metadata changes should at least parse cleanly

Future code verification:

- `npm install` if dependencies are absent
- `npm run build`
- targeted manual VS Code extension host smoke test
- WebView smoke for Markdown and binary previews
