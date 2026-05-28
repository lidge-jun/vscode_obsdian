# rhwp-studio Vendored Runtime

Upstream: https://github.com/edwardkim/rhwp
Pinned tag: v0.7.13
Pinned commit: b3e16ef212af81ef37d973ddb86d6816d3804642
Wrapper package reference: @rhwp/editor@0.7.13

Build environment:
- Date: 2026-05-29
- Rust: cargo 1.93.1
- WASM target: wasm32-unknown-unknown
- wasm-pack: 0.15.0
- Node package manager: npm install using rhwp-studio/package-lock.json

Build commands:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/edwardkim/rhwp vendor/rhwp-src
cd vendor/rhwp-src
git checkout v0.7.13
wasm-pack build --target web
cd rhwp-studio
npm install
npm run build
```

Notes:
- The first clone without `GIT_LFS_SKIP_SMUDGE=1` failed because the upstream
  repository exceeded its Git LFS budget while downloading sample PDF assets.
- LFS sample PDFs are not needed for `rhwp-studio` runtime generation.
- `rhwp-studio/dist` was copied into this directory after the successful build.
- The extension must load this local bundle through `webview.asWebviewUri`.
- The live default `https://edwardkim.github.io/rhwp/` runtime is not used by
  default in vscode_obsdian.
