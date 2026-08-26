# CivicFlow MY Mobile — Reviewer UAT — 2026-08-26

## Verdict

**PASS for the current MAIC public synthetic demo.** Based on the fresh checks recorded below, all documented reviewer-facing citizen, officer, supervisor, evidence, lifecycle and reset functions were exercised against the current source and/or the deployed public boundary. No release-blocking functional, console, responsive-layout or state-integrity defect remains unresolved in this UAT scope.

This is not a production-readiness verdict. The demo intentionally has no login, persistent database or real identity/RBAC layer. Officer and supervisor labels are demo inputs, and `POST /api/reset` is publicly reachable. These limits are acceptable only for the clearly labelled, 100% synthetic competition demo.

## Target

- Public URL: `https://maic.aifather.dpdns.org`
- VM deployment marker: `292c16885aa41c977a83ab793c7172087de54441`
- Source baseline inspected during UAT: GitHub `main` at `eda78bc5fa46dd6abbab7b6f88252512c3576792`. Application source was unchanged between these revisions; the latter added three deployment-evidence documentation files.
- Runtime path under test: deterministic TypeScript with no required API key.
- Browser coverage: Chromium through the in-app Browser and repository Playwright; `1280x720`, `1366x900`, `390x844` and `320x700` viewports.

## Requirement-to-evidence matrix

| Reviewer-facing requirement | Evidence exercised | Result |
|---|---|---|
| Role launcher and public no-login entry | `/` rendered both Citizen services and Officer workspace with synthetic-data warning; page identity, DOM, screenshot and console checked | PASS |
| Four-language citizen experience | Bahasa Melayu, English, 中文 and தமிழ் controls, localized labels/errors, Tamil request preview and Chinese tracking were exercised; no horizontal page overflow at 390px | PASS |
| Citizen preview, submission, tracking and follow-up | Local citizen smoke covered review/submit, missing-info follow-up, tracking-code normalization, sent reply and localized 404; public Browser checked Tamil preview and `CF-LIC001` Chinese tracking | PASS |
| Synthetic-data boundary | Realistic personal-name/address-shaped input returned HTTP 422 `synthetic_data_only`; localized UI errors remained user-facing | PASS |
| Citation or manual review | Drainage/licence/welfare citations rendered with source, section and confidence; low-confidence unknown input entered `manual_review` and could not start | PASS |
| Officer queue, search and next action | Active/Needs review/Needs approval/In progress/Closed/All controls, queue search, hidden closed cases and next-action grouping were exercised | PASS |
| Officer review and evidence selection | Language/category/routing, policy search/checkboxes, review note, reply drafts and decision ordering were exercised; saving review remained separate from sending | PASS |
| High-risk supervisor gate | Pre-review decision, wrong role, empty note and pre-approval start were rejected; current reviewed revision approval succeeded and preserved actor, note and evidence | PASS |
| Welfare human outcome | Reply/start remained disabled before the officer recorded an eligibility outcome; no supervisor task or automatic eligibility decision was created | PASS |
| Reply, work start and closure | Reviewed reply send, explicit start, mandatory closure note and final closed read-only state were exercised | PASS |
| Closed-case immutability | Review, reply, status, citizen-detail and repeated-approval writes were all rejected after closure; case revision/state stayed unchanged | PASS |
| Revision-bound approvals | A substantive second review superseded the old task; old-task decisions using both old and new revisions were rejected while the new task remained pending | PASS |
| Append-only audit and search | Existing event IDs remained present after rejected writes; audit mutation returned 405; public search returned 14 `CF-DRN001` events and the 320px table remained region-scoped and horizontally scrollable | PASS |
| Reset and recovery | Isolated and public resets restored the exact six seed case IDs, 63 seed audit events and one seed approval; UAT-created cases were removed | PASS |
| Responsive and accessibility baseline | Skip links, labelled inputs, alert/status regions, focusable audit region, keyboard tabs/search/filter interactions, disabled-action reasons, mobile Tamil/Chinese rendering and desktop/mobile screenshots were checked | PASS |

## Fresh executed evidence

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 10 test files; 76 tests passed |
| `node --test scripts/smoke/helpers.test.mjs` | 3 passed; 0 failed |
| `npm run build` | exit 0; 20 routes generated |
| `npm audit --omit=dev --audit-level=moderate` | exit 0; 0 vulnerabilities |
| `npm run smoke:citizen` | local dev instance passed, including four locales, mobile behavior, follow-up, tracking, reply and localized 404 |
| `CIVICFLOW_SMOKE_NEXT_COMMAND=start npm run smoke:officer` | local production instance passed the full officer workflow |
| `npm run smoke:e2e` | local production passed four canonical cases, closure/immutability gates and 10 rendered views |
| Isolated local negative API UAT | 37 assertions passed: manual review, approval guards, reply/start/closure order, five closed-case mutators, superseded task, audit integrity and exact reset baseline |
| `CIVICFLOW_BASE_URL=https://maic.aifather.dpdns.org npm run smoke:e2e` | public production passed four canonical cases and 10 rendered views |
| Final public recovery | reset `ok=true`; 6 cases; 63 audit events; 1 approval; all 7 public routes HTTP 200 |

One post-reset timing sample returned the seven public routes in 93–292 ms. This is reachability evidence, not an SLA or production performance claim.

## Browser and visual evidence

- Page title was `CivicFlow MY — Citizen service casework`; no blank page or framework error overlay appeared.
- Console error/warning checks were empty on the role launcher, citizen form, Tamil preview, Chinese tracking, officer queue, welfare detail, approvals and audit search.
- Manual responsive checks found no page-level horizontal overflow at 320px or 390px. The audit table intentionally scrolls inside its labelled, focusable region.
- All 11 current screenshots in `output/playwright/maic-smoke/` were visually inspected. No collision, clipping, missing asset or unreadable status/action overlap was found. The full audit page is dense, but search and contained horizontal scrolling keep it usable.

## Classified non-product failures

1. `npm run smoke:officer` in **development** mode failed twice only at its final browser-health assertion because Next dev cancelled two versioned `main-app.js` requests during repeated audit navigation. Every functional assertion had already completed. The required production-mode run passed; no source or assertion was weakened.
2. Pointing `smoke:citizen` directly at production stopped at its development-oriented assertion that HTML contain no React streaming markers. Both local production and public production returned HTTP 200, contained the localized server content and panels, and used the same valid Next streaming markers. The public in-app Browser and production E2E passed, so this command is not used as a production oracle.
3. The first custom unknown-case check incorrectly required zero citations. The actual contract is stronger and different: low classification confidence forces `manual_review` even when broad service-charter citations exist. The UAT oracle was corrected to the documented lifecycle rule; implementation was not changed.

## Residual demo boundaries

- No real authentication, server-derived officer/supervisor identity or RBAC is implemented. The UI proves workflow checkpoints, not an unforgeable human identity.
- State is process-local memory. Restart or public reset restores fixtures and clears UAT activity; audit is append-only only within one store lifetime.
- The optional Anthropic path was not exercised because the judging path requires no key and uses deterministic rules. Tests verify that provider failure cannot weaken deterministic risk gates.
- No Safari, Firefox, physical-device or screen-reader session was run. Chromium semantic DOM, keyboard interactions, desktop/mobile viewports and automated accessibility assertions provide the current competition-demo evidence.

## Reviewer-ready final state

The public instance was reset after all hosted tests. The final observable state is six documented seed cases, 63 audit events, one seed approval, seven HTTP 200 public routes and no UAT-created case residue.
