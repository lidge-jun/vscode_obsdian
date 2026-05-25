# vscode_obsdian Structure Index

이 디렉터리는 코드 수정 전에 현재 상태를 고정해 두는 기준 문서입니다. 지금 단계의 목적은 `rjwang1982/vscode-office`를 MIT 라이선스 기반의 새 로컬 프로젝트 `vscode_obsdian`으로 가져온 뒤, 구현에 들어가기 전에 구조와 리스크를 분리해서 기록하는 것입니다. 단, `rjwang1982/vscode-office`는 `cweijan/vscode-office`의 fork이므로 attribution에는 두 upstream 계열을 모두 남깁니다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

현 시점에는 코드, 패키지 메타데이터, README 원문을 수정하지 않았습니다. 이 문서 세트는 다음 구현 단계에서 “무엇을 바꿀지”를 판단하기 위한 기준선입니다.

## Documents

- [direction.md](direction.md) — 제품 정체성, attribution 원칙, 기능 우선순위, non-goal을 한 번에 보는 방향성 문서
- [roadmap.md](roadmap.md) — rebrand, wikilink, PPTX, 취소선, fallback 구현 순서와 완료 기준
- [architecture.md](architecture.md) — 현재 확장 구조, 주요 파일, 데이터 흐름, 파일 타입 라우팅
- [conventions.md](conventions.md) — 현재 관찰된 네이밍/빌드/문서 컨벤션과 새 프로젝트 쪽 컨벤션 제안
- [research.md](research.md) — agbrowse Grok Expert와 공식 문서 기반 조사 요약
- [research-comparable-repos.md](research-comparable-repos.md) — 유사 repo와 적용 가능한 구현 방식 비교
- [research_notes/00_index.md](research_notes/00_index.md) — 위키링크, PPTX, 취소선, rebrand를 주제별로 쪼갠 상세 조사 노트
- [risks.md](risks.md) — 위키링크, PPTX, 취소선, WebView 보안, 라이선스 리스크
- [license-attribution.md](license-attribution.md) — MIT 파생 코드의 라이선스/고지 전략

## Current Scope

이번 스캐폴딩은 문서만 추가합니다.

- 코드 수정 없음
- README 수정 없음
- `package.json` 수정 없음
- git commit/push 없음
- 원본 MIT 라이선스 보존

## Next Source Of Truth

구현 계획은 [devlog/_plan/260524_vscode_obsdian_baseline/00_overview.md](../devlog/_plan/260524_vscode_obsdian_baseline/00_overview.md)에 있습니다.
