# MAIC Preliminary Freeze Hardening - 2026-08-26

## Verdict

The freeze Pitch PDF and reviewed AI disclosure are saved in the MAIC portal and verified by direct readback. Application revision `292c16885aa41c977a83ab793c7172087de54441` was pushed to public GitHub `main` and deployed to the existing `maictest` VM after its new local address was verified as `192.168.1.7`. The origin, public routes, hosted E2E and post-test six-case reset all passed.

The current submission remains a synthetic MAIC T5 demonstration. This pass does not add production identity, persistent storage, real policy data, a government integration, commercial traction, or a conformity/certification claim.

## Changes

- Reordered the officer case-detail page so the next required human action and decision controls precede the longer governance receipt and audit history.
- Added a server-rendered `GET ?q=` audit search covering every displayed field: date/time, revision, event type, actor, actor label, summary, case ID and citizen reference. It also includes repeated-query normalization, result count, clear action and empty state.
- Renamed the public reset control to `Reset synthetic demo`.
- Corrected the documented lifecycle precedence: missing information resolves first, then citation/confidence failures remain in manual review. Once those prerequisites clear, a high-risk case receives the pending approval; current-revision officer review is required before a supervisor can decide; approval returns the case to `routed`; reply release and explicit start work precede `in_progress`; closure remains human-owned.
- Synchronized the same conditional lifecycle across `AGENTS.md`, the architecture, AI/model/data cards, privacy controls, source mapping and the shared `CitizenCase` type comment.
- Updated the MAIC materials freeze to `2026-08-31 23:59 MYT` from the portal announcement published on 2026-08-26.
- Replaced placeholder accountability text with a team-owned MAIC contact-of-record statement and documented direct use of OpenAI ChatGPT and Codex. The optional Anthropic path remains a disabled-by-default runtime option, not a judging dependency.
- Produced a revised 12-page Pitch PDF with the slide 4 screenshot crop corrected, the slide 6 footer restored, a visible AIGE/ISO source line on slide 11 and source-only notes in the editable review candidate.

## Final local artifacts

| Artifact | Result |
|---|---|
| `E:\Administrator\Downloads\CivicFlow_MY_MAIC_Nexus_2026_100to30_Final.pdf` | Controller-local output outside the repository; 12 pages; 293,424 bytes; SHA-256 `04B86DC29F6C24DBDCD7268BAC3457F767E6170F5C1AA58C7D0BBB20226D9381` |
| `CivicFlow_MY_MAIC_Nexus_2026_Technical_Architecture.pdf` | 4 pages; unchanged baseline SHA-256 `6424B172C7F7061D7D5D07F5369155193571F2A20E85BCFBCE7A8FBA6681C00B` |
| `civicflow-my-mobile-real-ui-demo-179s.mp4` | 179 seconds; unchanged baseline SHA-256 `517DC0710E56A675732D9DD8D95F5967E7E9D03549D4C9999C2B6272452D5342` |

The prior Pitch PDF is recoverable at `E:\Administrator\Downloads\CivicFlow_MY_MAIC_Nexus_2026_100to30_Final.pdf.bak-20260826` with SHA-256 `049F3713D576A922A791C8BD2A13A98A0EAE8E166527E947620468E643A4E767`.

## Portal readback

The portal displayed `Materials updated successfully.` and returned to the submitted Application Summary. Direct readback at `2026-08-26 18:34 MYT` established:

| Portal artifact | Readback result |
|---|---|
| Pitch PDF | HTTP 200; 293,424 bytes; SHA-256 `04B86DC29F6C24DBDCD7268BAC3457F767E6170F5C1AA58C7D0BBB20226D9381` |
| Technical Architecture PDF | HTTP 200; 143,610 bytes; SHA-256 `6424B172C7F7061D7D5D07F5369155193571F2A20E85BCFBCE7A8FBA6681C00B` |
| Demo video | HTTP 200; 8,221,356 bytes; SHA-256 `517DC0710E56A675732D9DD8D95F5967E7E9D03549D4C9999C2B6272452D5342` |

The dashboard also showed the 386-word summary, the 474-character AI tools-and-models disclosure, `Submitted`, `Preliminary — Preparation` and `Payment Confirmed`. Evidence: [MAIC portal freeze screenshot](maic_portal_freeze_saved_2026-08-26.png).

## Presentation verification

- The final PDF renders 12 pages and every page contains selectable text.
- Residue scan: no `TODO`, PowerPoint prompt, template-production marker or prior drafting note.
- Slides 4, 6 and 11 contain the intended visible changes; the other nine artifact-tool renders are pixel-identical to the source.
- The editable review candidate opens and renders correctly in Microsoft PowerPoint, has 12 source-only notes, no empty structural placeholders, no hidden slides and no comments.
- Strict PPTX package preservation remains a known tooling limitation: artifact-tool canonicalises duplicate SVG fallback media. The submitted PDF is unaffected, so the original editable PPTX is preserved and the reviewed candidate remains a separate file rather than replacing it.

## Fresh source and runtime gates

| Command | Result |
|---|---|
| `node --test scripts/smoke/helpers.test.mjs` | exit 0; 3 passed |
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 10 files / 76 tests passed |
| `npm run smoke:citizen` | exit 0; Citizen UI smoke passed |
| `npm run build` | exit 0; 20 routes built |
| `$env:CIVICFLOW_SMOKE_NEXT_COMMAND='start'; npm run smoke:officer` | exit 0; production Officer UI smoke passed |
| `$env:CIVICFLOW_BASE_URL='http://127.0.0.1:3113'; npm run smoke:e2e` | exit 0; 4 canonical cases, closure/immutability gates and 10 rendered views |
| `npm audit --omit=dev --audit-level=moderate` | exit 0; 0 vulnerabilities |
| Impeccable layout detector over changed UI | exit 0; `[]` |

The production test server was stopped after verification. Ports `3012`, `3013`, `3014`, `3015` and `3113` were closed in the final cleanup check.

## Workspace hygiene

- The task-created `.playwright-cli` files and empty directory were removed after their owning processes stopped.
- Dated backups created by this pass remain untracked and recoverable, as required by the repository operating rules.
- Pre-existing `.superpowers/`, older dated backups and prior `tmp/` work were preserved and excluded from the scoped commit. Their presence means the whole working directory is not described as clean; the tracked/staged package is evaluated separately.

## Deployment closure

1. [x] Locate the existing VM without changing the Cloudflare Tunnel configuration. The old `192.168.1.9` address had moved to `192.168.1.7`; the `maictest` hostname and previously trusted SSH host-key fingerprint matched.
2. [x] Deploy application revision `292c16885aa41c977a83ab793c7172087de54441` through the isolated build, seven-route staging probe and atomic-swap procedure.
3. [x] Run the authorised hosted synthetic E2E, restore the public store to six seed cases and verify the final VM/public state.

## Deployment evidence

- GitHub `main`, `origin/main`, direct remote lookup and GitHub API readback matched application revision `292c16885aa41c977a83ab793c7172087de54441` before packaging.
- The tracked-files archive was generated from that revision; no untracked 2026-08-26 backups, `.superpowers/`, `tmp/`, `.next`, `node_modules` or `.env` were included. Its SHA-256 was `0db4a02b08e4a770d3b8d15215d3569d32d0ddb4a9da133683569f5e617eb04d`.
- The isolated VM release completed `npm ci`, `npm run build`, `npm audit --omit=dev --audit-level=moderate` with 0 production vulnerabilities, and seven HTTP 200 staging probes on `127.0.0.1:3014`. The owned staging process was stopped and port `3014` was confirmed free.
- The atomic swap retained `/opt/civicflow-my-maic-demo.rollback-20260826T111613Z`. `civicflow-maic.service` and `cloudflared.service` are active; all seven origin and public routes returned HTTP 200; the public audit-search and `Reset synthetic demo` copy are present.
- `CIVICFLOW_BASE_URL=https://maic.aifather.dpdns.org npm run smoke:e2e` passed four canonical cases, closure and immutability gates, and ten rendered views. `POST /api/reset` then returned `ok=true`, and `GET /api/cases` returned six seed cases.
- The older rollback `/opt/civicflow-my-maic-demo.rollback-20260811T221418Z` was removed after the new rollback and hosted checks passed, freeing 630,590,358 bytes. The retained rollback is the immediately prior deployed revision; root free space is 1,256,042,496 bytes.
- The Cloudflare Tunnel configuration was not changed.

No external claim, partner validation or measured public-service outcome was invented in this pass.
