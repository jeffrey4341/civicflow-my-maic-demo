# Citizen case status timeline verification — 2026-08-11

## Scope

The citizen tracking page now shows the complete case path instead of stopping at the current status, and the request summary includes the citizen's exact submitted text. Completed, current, and upcoming stages remain visually and textually distinct in Malay, English, Chinese, and Tamil.

The timeline preserves workflow boundaries:

- upcoming stages are not presented as completed work;
- supervisor review appears only when it is the current case status;
- `close_no_action` cases proceed from manual review to closed without showing an in-progress stage.

## TDD evidence

- RED: `npm run build` exited 0, then `npm run smoke:e2e` exited 1 with `Manual-review citizen timeline does not show the full five-step path.`
- The first GREEN attempt rendered all five steps but exposed a test-fixture mismatch because the visible step numbers were omitted from the expected text. The expectation was corrected without changing product behaviour.
- GREEN: `npm run smoke:e2e` exited 0 and verified the exact manual-review path at 390 px: Submitted / Manual review / Routed to department / In progress / Closed, with Manual review announced through `aria-current="step"`.
- Original-request RED: `npm run smoke:e2e` exited 1 with `Citizen status does not show the exact submitted request text.`
- Original-request GREEN: the exact submitted text is shown under a localized `Your request` label, preserving line breaks, long-word wrapping, and text direction; `npm run build` and `npm run smoke:e2e` both exited 0.
- Full citizen smoke initially failed twice because the new text repeated the page's existing language declaration. The nested `lang` attribute is now emitted only when the detected language differs from the citizen UI language; the final `npm run smoke:citizen` exited 0 without weakening the existing assertion.

## Final gates

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0 — 10/10 files, 76/76 tests |
| `npm run smoke:citizen` | exit 0 — 320 px citizen flow and overflow checks passed |
| `npm run smoke:officer` | exit 0 — officer review, reply, work-start, closure, and audit flow passed |
| `npm run build` | exit 0 — Next.js 15.5.22, 20 routes |
| `npm run smoke:e2e` | exit 0 — 4 canonical cases and 10 rendered views |
| `npm audit --omit=dev --audit-level=moderate` | exit 0 — 0 production vulnerabilities |
| Impeccable mechanical detector | exit 0 — `[]` |

The 390 px rendered status screenshot was visually inspected. Ports 3012 and 3013 were confirmed closed after verification.

## Deliberately not done

- No deployment or push was performed in this task.
- Existing untracked `.superpowers/` content and the two 2026-08-10 package backups were left untouched.
