# vscode_obsdian

[English](README.md) | [简体中文](README-CN.md) | 한국어

`vscode_obsdian`은 VS Code 안에서 Office 문서, Markdown 노트, PDF, 이미지,
압축 파일, 그리고 HWP/HWPX 문서를 열기 위한 독립 확장입니다.

가장 큰 차별점은 **내장 HWP/HWPX 편집**입니다. 확장 안에 로컬
`rhwp-studio` 런타임과 WASM 엔진을 함께 싣기 때문에, 일반적인 `.hwp`와
`.hwpx` 파일을 한컴오피스, LibreOffice, 외부 서버 없이 열고 편집하고
저장할 수 있습니다.

이 프로젝트는 Obsidian, 한컴, Microsoft, cweijan/vscode-office,
rjwang1982/vscode-office, rhwp와 공식 제휴 관계가 없습니다.

## 주요 기능

- **HWP/HWPX 편집**: rhwp 전체 툴바, 텍스트 편집, 표/셀 선택, VS Code
  저장 lifecycle 연동.
- **Office preview**: Word, Excel, PDF, PowerPoint, 이미지, 폰트, 압축 파일,
  HTTP request 파일, registry 파일, HTML preview.
- **Markdown 작업**: Vditor 기반 Markdown 편집과 PDF/DOCX/HTML export 경로.
- **오프라인 HWP 런타임**: 기본값은 외부 사이트가 아니라 내장
  `resource/rhwp-studio` 번들입니다.
- **명확한 출처 표기**: MIT 계보와 third-party credit은 `NOTICE.md`와
  `LICENSE`에 보존합니다.

## 설치

Marketplace 배포 후에는 publisher `jun6161`의 `vscode_obsdian`으로 설치할
수 있습니다. Release VSIX를 직접 설치할 수도 있습니다.

```bash
code --install-extension vscode-obsdian-3.7.5.vsix
```

VS Code Insiders:

```bash
code-insiders --install-extension vscode-obsdian-3.7.5.vsix --force
```

설치 후 `.hwp` 또는 `.hwpx` 파일을 열면 `vscode_obsdian` custom editor로
열립니다.

## 지원 형식

| 형식 | 확장자 | 모드 | 비고 |
| --- | --- | --- | --- |
| HWP / HWPX | `.hwp`, `.hwpx` | 편집 | 내장 rhwp-studio WASM 런타임. HWP는 HWP로, HWPX는 HWPX로 저장합니다. |
| Excel | `.xls`, `.xlsx`, `.xlsm`, `.csv`, `.ods` | Preview / 기존 편집 경로 | 상속된 spreadsheet viewer 사용. |
| Word | `.docx`, `.dotx` | Preview | docx-preview/docxjs 기반 렌더링. |
| PowerPoint | `.pptx` | 읽기 전용 preview | 텍스트/이미지 preview 중심. PowerPoint 수준 fidelity는 아직 목표가 아닙니다. |
| Legacy PowerPoint | `.ppt` | 선택적 fallback | LibreOffice opt-in 경로. 기본 비활성. |
| PDF | `.pdf` | Preview | 내장 PDF viewer. |
| Markdown | `.md`, `.markdown` | 편집 | Vditor 기반. PDF/DOCX/HTML export 지원. |
| 이미지/폰트/압축 | 여러 확장자 | Preview | 기존 vscode-office 계열 viewer surface. |

## HWP/HWPX 저장 정책

HWP/HWPX는 VS Code의 editable `CustomEditorProvider` lifecycle에 연결되어
있습니다.

```text
파일 열기
  -> rhwp-studio 로컬 runtime
  -> 편집
  -> Cmd+S 또는 Save HWPX
  -> exportHwp/exportHwpx
  -> VS Code saveCustomDocument
  -> 원래 파일에 format-aware 저장
```

정책:

- `.hwp`는 HWP binary로 저장합니다.
- `.hwpx`는 HWPX zip/XML package로 저장합니다.
- `.hwpx` 파일에 HWP bytes를 조용히 덮어쓰지 않습니다.
- 같은 포맷 저장은 Save As/overwrite 모달 없이 원래 파일에 저장합니다.
- 원격 `hwp.studioUrl`은 고급 opt-in 설정이고, 기본값은 로컬 번들입니다.

## 설정

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| `vscode-obsdian.hwp.experimentalSave` | `true` | HWP/HWPX 상단 저장 버튼 표시. VS Code 기본 저장도 계속 동작합니다. |
| `vscode-obsdian.hwp.studioUrl` | `""` | 신뢰하는 remote rhwp studio URL. 비워두면 로컬 번들을 사용합니다. |
| `vscode-office.editorMode` | 기존값 | Markdown editor mode. |
| `vscode-office.pptx.libreOfficePath` | `""` | legacy `.ppt` fallback용 LibreOffice 경로. |

일부 `vscode-office.*`, `office.*`, `cweijan.*` ID는 기존 설정, 단축키,
custom editor association 호환을 위해 남겨두었습니다. Runtime ID migration은
별도 작업으로 다룹니다.

## 릴리즈 검증

로컬 릴리즈 전에는 다음 명령을 실행합니다.

```bash
npm run release:local
```

이 명령은 TypeScript 검사, production build, HWP hardening 검증, VSIX 패키징,
VSIX 내용 검사를 순서대로 수행합니다. VSIX 안에 로컬 `rhwp-studio` runtime과
WASM 자산이 들어 있고, upstream samples, vendor source, docs site, 개발 스크립트가
빠져 있는지도 확인합니다.

배포 전 수동 smoke test:

| 단계 | 기대 결과 |
| --- | --- |
| 생성된 VSIX를 VS Code 또는 VS Code Insiders에 설치합니다. | 확장이 활성화되고 HWP/HWPX custom editor를 선택할 수 있습니다. |
| `.hwp` 파일을 열고 저장합니다. | rhwp 편집기가 보이고 저장 후에도 HWP입니다. |
| `.hwpx` 파일을 열고, 텍스트를 수정하고, 표 셀을 선택하고, 저장한 뒤 닫았다가 다시 엽니다. | 문서가 다시 열리고 저장 후에도 HWPX이며 표/셀 상호작용이 유지됩니다. |
| Markdown, XLSX, DOCX, PDF, PPTX, 이미지, 압축 파일 샘플을 엽니다. | 기존 viewer/editor 경로가 계속 동작합니다. |
| HWP 로딩 상태와 저장 UI를 확인합니다. | stale loading banner나 잘못된 Save As 반복 프롬프트가 남지 않습니다. |

## 알려진 제한

- rhwp는 한컴오피스 엔진이 아니므로 복잡한 문서에서 layout/round-trip 차이가
  있을 수 있습니다.
- 한컴/Microsoft proprietary font는 번들하지 않습니다. 내장 오픈 폰트와
  시스템 폰트로 fallback합니다.
- PPTX는 현재 read-only preview 중심입니다.
- Obsidian-style wikilink는 제품 방향이지만, 전체 Obsidian 기능 clone은
  목표가 아닙니다.

## 출처와 라이선스

이 프로젝트는 MIT 라이선스 기반 `vscode-office` 계열 코드를 포함합니다.

- [cweijan/vscode-office](https://github.com/cweijan/vscode-office), Weijan Chen의 원본 프로젝트
- [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office), RJ.Wang의 유지 fork

HWP/HWPX 편집은 [edwardkim/rhwp](https://github.com/edwardkim/rhwp)의 로컬
빌드를 사용합니다. 자세한 고지는 [NOTICE.md](NOTICE.md)와 [LICENSE](LICENSE)에
있습니다.
