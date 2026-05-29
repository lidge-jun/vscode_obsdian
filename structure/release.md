# Release Runbook

## Purpose

This document is the source of truth for packaging and publishing
`vscode_obsdian`. It covers GitHub Releases, GitHub Pages, VSIX inspection, and
Marketplace publishing gates.

## Prerequisites

- Node.js 20.x
- npm dependencies installed with `npm install`
- `vsce` available on PATH for packaging and Marketplace publish
- `gh` authenticated for GitHub Release creation
- VS Code or VS Code Insiders for manual smoke tests

## Build Pipeline

```text
vendor/rhwp-studio-dist
  -> build.ts copy plugin
  -> resource/rhwp-studio
  -> WebView path/WASM rewrite
  -> HWP hardening verification
  -> VSIX package
  -> VSIX content verification
```

`resource/rhwp-studio` is intentionally gitignored. Always run `npm run build`
before HWP smoke tests or packaging.

## Local Release Gate

```bash
npm run release:local
```

This expands to:

```text
typecheck
build
verify:hwp
verify-vsix source/build checks
package
verify-vsix package checks
```

The VSIX verification must confirm:

- `extension/resource/rhwp-studio/index.html` exists
- rhwp-studio WASM assets are included
- `NOTICE.md` and `LICENSE` are included
- `vendor/` is excluded
- `resource/rhwp-studio/samples/` is excluded
- `docs/` and `scripts/` are excluded from the VSIX

## Manual Smoke Tests

After packaging:

```bash
code-insiders --install-extension ./vscode-obsdian-3.7.5.vsix --force
```

Smoke matrix:

| Surface | Check |
| --- | --- |
| HWP | Open `.hwp`, edit text, save, close, reopen |
| HWPX | Open `.hwpx`, edit text, select table cells, save, close, reopen |
| HWP save UI | Confirm no stale loading banner and no false Save As loop |
| Markdown | Open `.md`, edit with Vditor, switch mode |
| Excel | Open `.xlsx` or `.csv` |
| Word | Open `.docx` |
| PDF | Open `.pdf` |
| PPTX | Open `.pptx` as read-only preview |
| Archive | Open `.zip` |

## GitHub Pages

The public product page lives under `docs/` and is deployed by
`.github/workflows/pages.yml`.

The first Actions deploy uses `actions/configure-pages` with Pages enablement so
the repository can create the Pages site before uploading the static `docs/`
artifact.

If GitHub blocks Pages creation from the workflow token, create the Pages site
once with an owner token and `build_type=workflow`, then rerun the workflow.

Runtime note: GitHub Pages is a marketing/documentation site only. The extension
does not use GitHub Pages at runtime by default. HWP/HWPX editing uses the
bundled local `resource/rhwp-studio` runtime unless the user explicitly sets
`vscode-obsdian.hwp.studioUrl`.

## GitHub Release

After `npm run release:local` and manual smoke tests:

```bash
VERSION=$(node -p "require('./package.json').version")
gh release create "v${VERSION}" "vscode-obsdian-${VERSION}.vsix" \
  --title "v${VERSION}" \
  --notes-file CHANGELOG.md
```

For release notes, prefer a short curated note rather than the full changelog if
the changelog has long upstream history.

## Marketplace Publish

Marketplace publish is intentionally separate:

```bash
npm run publish
```

Before running it:

- Confirm Marketplace version has not already been published.
- Run `npm audit --omit=dev` and either fix or document accepted residual risk.
- Confirm README and NOTICE match the shipped VSIX.
- Confirm HWP/HWPX smoke tests pass in a fresh VS Code or Insiders session.

Current audit note: as of 2026-05-29, `npm audit --omit=dev` still reports
legacy dependency findings, including no-fix advisories in spreadsheet-related
packages. See `structure/risks.md` R10 before Marketplace publish.

## Rollback

If a release is bad:

1. Unpublish only if the Marketplace policy and impact justify it.
2. Prefer a hotfix patch version.
3. Re-run `npm run release:local`.
4. Attach the hotfix VSIX to a GitHub Release.
5. Document the issue in `CHANGELOG.md`.
