# Dependency Audit Snapshot

Created: 2026-05-29
Scope: `npm audit --omit=dev` release gate for `vscode_obsdian`

## Current Known Audit Categories

This snapshot records the 2026-05-29 read-only audit summary. It must be
replaced with fresh `npm audit --omit=dev --json` output before release.

| Package / chain | Severity | Fix available | Decision | Owner phase |
|-----------------|----------|---------------|----------|-------------|
| `minimist` via `x-data-spreadsheet` / `opencollective` | critical | TBD | triage required | dependency-risk phase |
| `node-fetch` | high | TBD | triage required | dependency-risk phase |
| `tmp` | high | TBD | triage required | dependency-risk phase |
| `xlsx` | high | no fix reported in audit summary | replace or accept with rationale | dependency-risk phase |
| `file-type` | moderate | TBD | triage required | dependency-risk phase |

## Required Fresh Snapshot Template

```text
date:
command: npm audit --omit=dev --json
package:
severity:
via:
fix available:
decision: fix / accept temporarily / replace dependency
owner phase:
notes:
```

## Release Rule

Do not publish with untriaged high or critical findings. If a high or critical
finding is accepted temporarily, the acceptance must name the affected feature,
user impact, mitigation, and follow-up owner phase.
