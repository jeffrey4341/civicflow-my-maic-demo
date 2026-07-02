# Fable 5 System Audit — 2026-07-02

Evidence-based investigation of CivicFlow MY Mobile on branch `chore/demo-submission-pack` (dirty worktree preserved; user-owned changes inspected, not modified). Public MAIC T5 demo boundary confirmed: synthetic data only, AI drafts / humans decide, no production claims.

## 1. Launch / build / test truth (initial investigation run — historical)

> **Historical note:** this table records the initial investigation run (6 files / 29 tests, pre-follow-up). After the CF-03..CF-05 follow-up landed, the current suite is **9 files / 48 tests** — the authoritative current results are the "Post-change gates" table later in this document.

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | exit 0 |
| `npm test` | PASS — 29/29 (6 files: routing, classify, citation, audit, approval, lifecycle) | vitest run, no `ANTHROPIC_API_KEY` |
| `npm run lint` | PASS (alias of typecheck — same `tsc --noEmit` in package.json) | exit 0 |
| `npm run build` | PASS | Next.js 15.5.19 production build |
| `npm audit --omit=dev --audit-level=moderate` | PASS — 0 vulnerabilities | exit 0 |
| `npm run smoke:e2e` | PASS — 11 checks | self-started prod server on 127.0.0.1:3012, ready in 778 ms; screenshots in `output/playwright/maic-smoke`; server stopped by script |

Smoke checks covered: citizen `/m` render, officer queue, drainage case + approval blocker + citation, needs-info blocker + licensing citation, welfare officer-review + citation, audit route, denied-transition audit event.

## 2. Deploy readiness truth

- Local production launch (`npm run build` → `npm run start`) is verified working.
- **No hosted public demo URL exists.** No vercel/netlify/Docker/cloud config anywhere in the repo. The hosted-URL item is the single biggest MAIC submission blocker and requires action outside the repo (per `docs/audit/p0_p1_submission_completion_2026-06-18.md`).
- The dirty worktree links untracked files from tracked ones: `README.md` → `docs/roadmap/product_roadmap.md` (untracked), `docs/audit/README.md` → six untracked audit reports, `package.json` → untracked `scripts/demo|smoke`. Committing the modified files without the untracked ones ships dead links and broken scripts — commit them together.
- `output/` (~4.5 MB) + `outputs/` (~211 MB) + `.codex-remote-attachments/` were untracked and unignored; `.gitignore` entries added this session so `git add -A` cannot stage them.

## 3. Top findings (verified with file:line evidence)

1. **P1 — No hosted demo URL** (external blocker; see §2).
2. **P1 — No authentication layer**: supervisor approval accepts client-asserted `decided_role` from the request body (`src/app/api/approvals/[id]/route.ts:19-20`); `GET /api/cases` and `/api/audit` return everything to anonymous callers; `POST /api/reset` wipes all state including the audit log. Acceptable for a synthetic demo; now disclosed in README known-limitations and the route comment.
3. **Resolved in follow-up — LLM path parity**: `src/lib/ai/pipeline.ts` no longer force-bumps `category_confidence` to ≥0.9 after LLM refinement, so low-confidence default-deny remains reachable when a key is set. `tests/llm.test.ts` covers schema validation, no-key deterministic behavior, force-deterministic mode, and an LLM refinement that stays in `manual_review` when deterministic confidence is low.
4. **Resolved in follow-up — citizen mobile a11y cluster**: `maximumScale: 1` was removed; citizen sections now carry language attributes; textarea and missing-info inputs have programmatic labels; low-contrast informational text was lifted from slate-400 to slate-600 where touched.
5. **Resolved in follow-up — trust-critical labels**: the citizen reply disclaimer is now at least `text-xs` with `text-slate-600`, and audit events use explicit actor badges instead of color-only actor dots.
6. **Resolved in follow-up — officer mobile console**: officer navigation is visible below 640 px, queue/audit tables use horizontal scrolling, and a 375 px Playwright check confirmed Queue/Approvals/Audit links remain visible.
7. **Resolved in follow-up — national-flag language icons**: language display now uses native-script language names/text badges instead of country flags.
8. **P2 — PDPA pilot gaps** (documented, not demo blockers): no collection-point consent copy in `/m`; LLM path sends raw citizen text to Anthropic when a key is set (`src/lib/llm.ts:82`); no per-case erasure/access primitive.
9. **P3 — Docs drift fixed this session**: `manual_review` status was missing from lifecycle diagrams in README/AGENTS/AI_DISCLOSURE/DATA_CARD/MODEL_CARD (code truth: `src/lib/types.ts:51-70`); AGENTS.md said Next.js 14 (actual: 15.5.19); THIRD_PARTY_NOTICES lacked playwright; `source_mapping.md` disclosed the private reference repo's literal name.
10. **P3 — Remaining test/UI gap**: LLM no-key/parity and RAG eval tests are now in the main suite. The citizen progress timeline can still imply "Awaiting supervisor" as a passed milestone for never-gated cases; this remains outside CF-03..CF-05 public-demo scope.

Synthetic-data boundary: **clean** (no real-format NRIC/phone/address; policies headed SYNTHETIC; `Jalan SS2` is a documented area-level demo label). Enterprise-content leakage: only the repo-name disclosure above, fixed.

## 4. P0/P1 roadmap items (schema)

| ID | Horizon | Workstream | Item | Why now | Evidence | Priority | Owner role | Complexity | Dependencies | Acceptance criteria | Validation | Risk reduced | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CF-01 | Now / 0–2 days | Deployment & Pilot Operations | Publish a hosted public demo URL (no login) | MAIC treats login-walled artifacts as non-submissions | `maic_rules_feature_scan_2026-06-18.md:27`; no hosting config in repo | P0 | Owner | S | hosting account (external) | Public URL serves `/m`, `/officer`, `/api/cases`; smoke passes against it | `CIVICFLOW_BASE_URL=<url> npm run smoke:e2e` | Submission rejection | High |
| CF-02 | Now / 0–2 days | DevEx / CI/CD | Commit the dirty worktree as one coherent submission commit (modified files + untracked docs/scripts together; media stays ignored) | README/package.json reference untracked files | §2 above | P0 | Owner | XS | .gitignore fix (done) | `git status` clean; no dead links; `npm run smoke:e2e` still green | link check + smoke | Broken public artifact | High |
| CF-03 | This week | AI / RAG / Agent Workflow | Restore LLM-path parity: cap or remove the 0.9 confidence bump; merge `llm.test.ts`/`rag_eval.test.ts` from the stale worktree into `tests/` | Default-deny guardrail must hold in both modes | `pipeline.ts:87` | P1 | Engineer | S | none | Low-confidence branch reachable with key set; parity tests green with no key | `npm test` | Guardrail bypass in LLM mode | High |
| CF-04 | This week | UX / UI / Accessibility | A11y pass: remove `maximumScale:1`; per-section `lang` attributes; label all form controls; slate-400→slate-600 on informational text; actor badges + legible AI disclaimer | WCAG AA failures on the judge-facing mobile surface | §3 items 4–5 | P1 | Engineer | M | none | axe/manual checks pass; disclaimer ≥12 px ≥4.5:1; actors labeled | manual + smoke screenshots | Judge-visible a11y failures | High |
| CF-05 | This week | UX / UI / Accessibility | Officer console mobile fallback (visible compact nav; `overflow-x-auto` tables); replace flag icons with native-script language names | Demo judges on phones hit dead ends | §3 items 6–7 | P1 | Engineer | S | none | Queue/Approvals/Audit reachable at 375 px; no flags | manual at 375 px | Demo failure on mobile | High |

Deliberately deferred (Ponytail): auth/session layer, persistent DB, rate limiting, PDPA consent flows — Phase 1+ pilot scope per `docs/roadmap/product_roadmap.md`; do not build for the public demo.

## 5. Docs changed this session (docs-only; user-owned changes preserved)

- `.gitignore` — ignore `output/`, `outputs/`, `.codex-remote-attachments/`.
- `README.md` — lifecycle +`manual_review`; multilingual claim softened to heuristic+optional-LLM; Node 18.18+; `smoke:e2e` documented; known-demo-limitations bullet.
- `AGENTS.md` — Next.js 14→15; lifecycle +`manual_review`.
- `AI_DISCLOSURE.md`, `DATA_CARD.md`, `MODEL_CARD.md` — lifecycle +`manual_review`.
- `THIRD_PARTY_NOTICES.md` — playwright (Apache-2.0) row.
- `docs/reference/source_mapping.md` — private repo name neutralized.
- `docs/privacy/privacy_controls.md` — Access row qualified (unauthenticated demo API).
- `docs/roadmap/product_roadmap.md` — Phase 0 verification status block.
- `src/app/api/approvals/[id]/route.ts` — comment corrected (demo-level gating, no behavior change).
- `PRODUCT.md` — created (minimal product context derived from README/AGENTS.md).
- This file; pointer added to `docs/audit/README.md`.

## 6. Follow-up execution log

### 2026-07-02 baseline recheck before CF-03/CF-04/CF-05 edits

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS | Next.js 15.5.19 production build completed; all app/API routes built. |
| Local production launch | PASS | `npm run start -- --hostname 127.0.0.1 --port 3015`; checked `/`, `/m`, `/officer`, `/officer/approvals`, `/officer/audit`, `/api/cases`, `/api/audit` all HTTP 200; temp server stopped. |
| `npm run typecheck` | PASS | `tsc --noEmit` exit 0. |
| `npm test` | PASS | 6 files, 29/29 Vitest tests passed. |
| `npm audit --omit=dev --audit-level=moderate` | PASS | 0 vulnerabilities. |
| `npm run smoke:e2e` | PASS | 11 browser checks passed on self-started `127.0.0.1:3012`; screenshots regenerated under ignored `output/playwright/maic-smoke`. |

### 2026-07-02 P1 implementation follow-up

Scope completed:

- CF-03: removed the LLM confidence bump, exported strict LLM refinement validation for tests, merged the stale `llm.test.ts` / `rag_eval.test.ts` coverage into the main suite, and tightened RAG so category boost alone cannot produce off-topic citations.
- CF-04: removed mobile zoom blocking, added citizen-section language markers, added `htmlFor`/`id` to citizen form controls, improved informational contrast in touched surfaces, and replaced color-only audit actor markers with explicit actor badges.
- CF-05: made officer navigation visible below 640 px, changed queue/audit tables to horizontal scroll containers, and replaced national-flag language icons with native-script language names/text badges.
- CF-02: public-package commit is the remaining local P0 at the time of this log; media/build outputs stay ignored.
- CF-01: hosted public URL remains external; no repo hosting config or deployment was added.

Post-change gates:

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused red/green suite | PASS | `npx vitest run tests/llm.test.ts tests/rag_eval.test.ts tests/public_demo_ui.test.ts` passed: 3 files, 19/19 tests. |
| `npm run typecheck` | PASS | `tsc --noEmit` exit 0. |
| `npm test` | PASS | 9 files, 48/48 Vitest tests passed. |
| `npm run build` | PASS | Next.js 15.5.19 production build completed; all app/API routes built. |
| `npm audit --omit=dev --audit-level=moderate` | PASS | 0 vulnerabilities. |
| Local production launch | PASS | `npm run start -- --hostname 127.0.0.1 --port 3015`; checked `/`, `/m`, `/officer`, `/officer/approvals`, `/officer/audit`, `/api/cases`, `/api/audit` all HTTP 200; temp server stopped. |
| `npm run smoke:e2e` | PASS | 11 browser checks passed on self-started `127.0.0.1:3012`; screenshots regenerated under ignored `output/playwright/maic-smoke`. |
| Officer mobile check | PASS | Playwright at 375 x 812 confirmed Queue/Approvals/Audit links visible and audit table remained horizontally scrollable; screenshot regenerated under ignored `output/playwright/maic-mobile-officer.png`; temp server stopped. |
| Staged package secret scan | PASS | `gitleaks git --staged --redact --no-banner --no-color --verbose` scanned ~191 KB and found no leaks. |
| Staged source PII scan | PASS with documented placeholders only | Pattern scan matched only synthetic placeholder examples: `+60-XXXXXXXX`, `000000-00-0000`, `012-0000000`, `03-00000000`; no real citizen data was identified. |

Deliberately deferred: authentication/session layer, persistent database, rate limiting, and PDPA consent/access/erasure flows remain Phase 1+ pilot scope and were not built for the public demo.

Demo video note: `docs/audit/english_video_rebuild_2026-06-15.md` identifies `scripts/demo/render_timed_civicflow_video.mjs` as the current recommended render script, but `package.json` `demo:video` was not repointed in this follow-up because that was called out as an owner decision.

*Public hackathon artifact note: this audit supports a synthetic demo only — it is not production certification, live council approval, or evidence of real citizen-data processing.*
