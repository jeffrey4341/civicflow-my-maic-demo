# UI workflow follow-up verification — 2026-07-18

## Outcome

The three follow-up workflow defects found in a real browser journey are fixed and verified locally:

1. A high-risk reply now uses state-neutral governance wording, so the same officer-reviewed body remains accurate before and after supervisor approval and case closure.
2. Unreviewed high-risk work is shown as waiting for officer review, not as an actionable supervisor decision. Dashboard and queue counts use the same current-review rule.
3. Supported synthetic location text such as `Jalan SS2`, `Taman Demo`, and `Synthetic Market A` is persisted and rendered instead of appearing as not supplied.

The human-decision, citation, approval, and append-only audit guardrails were not weakened.

## Implementation boundary

- Reply generation changed only the four language-specific high-risk governance fragments.
- Approval storage and API semantics were preserved; only display grouping and derived counts changed.
- Location inference is deliberately limited to documented synthetic fixture shapes. It is not a general address parser.
- No new dependency, product feature, deployment, production claim, or real citizen data was added.

## Automated verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, 10 files / 74 tests |
| `npm test -- tests/citizen_details.test.ts` | PASS, 13/13 |
| `npm test -- tests/audit.test.ts tests/officer_review.test.ts` | PASS, 20/20 |
| `node --test scripts/smoke/helpers.test.mjs` | PASS, 2/2 |
| `node --check` for all four smoke scripts | PASS, exit 0 |
| `npm run smoke:citizen` | PASS, real browser journey |
| `npm run smoke:officer` | PASS, real browser journey including review/approval grouping |
| `npm run build` | PASS, Next.js 15.5.19, 20 routes |
| `npm run smoke:e2e` | PASS, 4 canonical cases, closure and immutability gates, 8 rendered routes |
| `npm audit --omit=dev --audit-level=moderate` | PASS, 0 vulnerabilities |

## Browser verification

A real in-app browser journey submitted a synthetic Malay flood-risk request, then checked the officer queue, approval workspace, case detail, supervisor decision, reply release, work start, closure, and citizen reply.

- Before officer review: `Needs supervisor` was 0 and the case appeared under `Waiting for officer review`.
- After officer review: the case moved to `Pending decisions` and became actionable for the supervisor.
- The case detail rendered `Jalan SS2` as the location.
- After approval and closure, the citizen reply retained the exact reviewed Malay body and did not contain the stale future-tense phrase.
- The citizen reply retained its Drainage Response SOP citation.
- At 320 px, the reply page had no horizontal overflow.
- Browser console checks were empty on the final officer and citizen pages.

## Failure trail and correction

- The new location-shape regression first failed as intended: expected `Synthetic Market A`, received `synthetic food stall will`. The matcher was then narrowed and the same test passed 13/13.
- Final independent review found that an optional synthetic-location tail could still absorb complaint words such as `residents` or `stopped`. New negative cases reproduced the issue, the location patterns were split by documented fixture shape, and the final targeted and full suites passed.
- An earlier end-to-end attempt in this session found no production `.next` build after development-mode smokes. The production build was regenerated, the command order was corrected, and the final cold-start end-to-end gate passed.

## Remaining boundary

This remains a synthetic public hackathon demo with in-memory storage. The result is local workflow-readiness evidence, not production certification or hosted deployment verification.
