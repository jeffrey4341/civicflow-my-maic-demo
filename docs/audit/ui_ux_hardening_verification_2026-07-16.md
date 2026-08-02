# UI/UX Hardening Verification — 2026-07-16

## Outcome

The planned local hardening pass is complete. The current branch preserves the high-risk supervisor gate across officer reclassification, closes the citizen tracking and feedback gaps, removes obsolete demo/rendering code, and finishes a restrained responsive UI pass. This remains a synthetic hackathon demo, not production certification or hosted-environment evidence.

## Implemented scope

- **Approval integrity:** a substantive officer reclassification creates a new triage revision, supersedes the old approval task, and keeps release/start/closure paths fail-closed until the current revision receives its required decision. The regression follows the real citizen-input and officer-review path.
- **Citizen recovery and feedback:** invalid tracking codes render a scoped 404 in Malay, English, Chinese, or Tamil with a route back to tracking; structured follow-up returns to a visible, focusable success status; the primary `/m` content is present in server HTML before hydration.
- **Officer workflow clarity:** queue search/filtering, next-action hierarchy, decision sections, approval history, reply send state, audit keyboard access, and narrow-screen table guidance remain visible and testable.
- **Code reduction:** commit `1363b11d5d6bb161fff2de51516d2f5cbb2199f9` removes three obsolete video renderers, stale narration, dead i18n/config/export paths, and duplicate smoke infrastructure: 21 files, 293 insertions and 2,155 deletions (net -1,862 lines).
- **Impeccable `adapt → quieter → polish`:** 320 px citizen and narrow officer layouts were checked for structural reflow, touch targets, focus and page overflow; the two remaining side-stripe quotations were replaced with quiet horizontal separators; the final UI uses no gradients, wide shadows, oversized card radii, decorative animation, or residual side-stripe treatments.
- **Smoke trust:** expected Next navigation/HMR aborts are recognized by one exact shared predicate. It accepts only GET requests with `net::ERR_ABORTED` for `_rsc` or `/_next/static/webpack/*.hot-update.js`; unrelated resource failures remain fatal.

## Same-session verification

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, 10 files / 67 tests |
| `node --test scripts/smoke/helpers.test.mjs` | PASS, 2 / 2 tests |
| `node --check` on all four smoke modules | PASS, exit 0 |
| `npm run build` | PASS, Next.js 15.5.19 production build, 20 routes |
| `npm run smoke:citizen` | PASS, real browser journey including four languages, follow-up, reply, 320 px, and localized 404 paths |
| `npm run smoke:officer` | PASS, complete review → reply → start → close journey plus 320 px audit keyboard access |
| `npm run smoke:e2e` | PASS, 4 canonical cases, closure and immutability gates, 8 rendered routes |
| `npm audit --omit=dev --audit-level=moderate` | PASS, 0 production vulnerabilities |
| `git diff --check` | PASS, exit 0 before the final code commit |

The first attempt to run both development-mode UI smokes concurrently was invalidated by a shared `.next` webpack-cache race (`ENOENT` during pack rename, followed by a generated-module error). The isolated officer run then completed the business journey but exposed an expected Next HMR `hot-update.js` abort as a smoke false positive. The matcher was corrected with a focused red/green regression test; the final citizen and officer smokes were run sequentially and passed. No failed attempt is counted as gate evidence.

## Browser evidence

- Officer queue, approvals, and audit were inspected at desktop width with no page errors or console warnings; queue search reduced the visible list to the requested case.
- Citizen tracking was inspected at 320 × 700 in Chinese: the selected tracking tab, localized copy, and controls stayed within the viewport (`documentElement.scrollWidth` did not exceed the viewport).
- The Chinese invalid-tracking route returned HTTP 404, kept citizen-only navigation, and provided a localized recovery link.
- The 320 px audit view kept page-level width contained while exposing the wider table inside a labelled, focusable horizontal-scroll region with keyboard movement and guidance.

The Impeccable detector reported one warning at the reply-status ternary in `src/app/officer/cases/[id]/page.tsx`. Manual inspection confirmed it is a parser false positive: the three mutually exclusive branches pair emerald-on-emerald, civic-on-civic, and slate-on-slate; no gray text is rendered on a colored background.

## Relevant commits

- `2f9ce570af400622ac20320aa431573d4ec9b0bc` — preserve approval gates across reclassification
- `5b27e3da51f7833e8295c71ac7805af1b21f5b50` — exercise the real input path in approval regression coverage
- `e3fad25bd8a79dfaa170df9c89ee1b0f236ea27f` — harden citizen and officer workflows
- `077277bff3f7ee31c65184bd1534b30f17a177cf` — address citizen workflow review findings
- `1363b11d5d6bb161fff2de51516d2f5cbb2199f9` — keep preview deterministic and remove stale code
- `4c72a94916024ca16bb4c494f7165820c3b22785` — verify owned smoke-server lifecycle
- `677ad3f1a793c5d52a7c38c8533521542e36edb9` — finish visual hardening and stabilize browser smoke

## Remaining boundaries

- Data is synthetic and in-memory; restart/reset removes runtime changes.
- There is no production officer identity, role enforcement, tenancy, persistent database, or authenticated reset endpoint.
- `/api/triage` is deliberately deterministic; optional LLM assistance remains limited to persisted workflows and must preserve the same structured shape.
- The production dependency audit is clean, but the full development tree still reports 4 advisories (2 moderate, 1 high, 1 critical). The Vite CJS deprecation warning also remains in test output.
- No hosted deployment, public tunnel, real device, Safari, Firefox, or external council integration was verified in this session.
