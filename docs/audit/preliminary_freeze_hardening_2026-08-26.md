# MAIC Preliminary Freeze Hardening - 2026-08-26

## Verdict

The local source tree and portal-ready Pitch PDF are ready for owner review. External publication remains intentionally pending: the updated source has not been pushed or deployed, and the MAIC portal still holds the pre-freeze Pitch PDF and prior AI-disclosure text.

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

## External actions pending owner confirmation

1. Commit the scoped source/document changes, push `main`, and deploy the exact pushed revision to the existing CivicFlow host.
2. Replace the portal Pitch PDF with SHA-256 `04B86DC29F6C24DBDCD7268BAC3457F767E6170F5C1AA58C7D0BBB20226D9381`.
3. Replace the portal tools-and-models disclosure with the reviewed ChatGPT/Codex wording.
4. Save and read back the portal, download the stored files, verify hashes and capture a new MYT-stamped screenshot before `2026-08-31 23:59 MYT`.

No external claim, partner validation or measured public-service outcome was invented in this pass.
