# GPT 5.5 CivicFlow Fix Report

Date: 2026-06-14

## 1. Summary of Changed Files

- `src/lib/lifecycle.ts` added the shared lifecycle policy for manual-review reasons and blocked status transitions.
- `src/lib/types.ts`, `src/lib/ai/pipeline.ts`, `src/lib/ai/reply.ts`, and `src/lib/store.ts` now persist `manual_review`, `manual_review_reason`, and `officer_review_only`, enforce server-side transition rules, require approval notes, and audit denied status attempts.
- `src/app/api/cases/[id]/status/route.ts` and `src/app/api/approvals/[id]/route.ts` now receive the stricter store behavior without trusting UI-only constraints.
- `src/components/officer/StatusActions.tsx`, `src/components/officer/ApprovalActions.tsx`, `src/app/officer/cases/[id]/page.tsx`, `src/components/ui.tsx`, `src/app/m/cases/[id]/page.tsx`, and `src/lib/i18n.ts` now reflect the same blocked lifecycle states and localized citizen badges.
- `tests/lifecycle.test.ts` adds regression coverage for the audit blockers.
- `package.json` makes `npm run lint` non-interactive.
- `.gitignore` now ignores local/generated artifacts including `.claude/`, `.vercel/`, `*.tsbuildinfo`, and logs.
- `docs/audit/dependency_risk_note.md` documents the remaining dependency audit risk.

## 2. Fixed P0/P1 Items

- P0 fixed: pending `awaiting_supervisor` cases with pending approvals cannot move to `in_progress` or `closed` through store or API.
- P0 fixed: denied unsafe status attempts emit `status.denied` audit events.
- P0 fixed: `needs_info` cases cannot advance through normal status mutation.
- P0 fixed: education/welfare cases cannot be closed through the generic status endpoint as if eligibility were approved.
- P0 fixed: zero-citation or low-confidence cases persist as `manual_review` with a visible reason.
- P0 fixed: officer UI hides unsafe Start/Close actions for pending approval, needs-info, and manual-review cases.
- P1 fixed: approval decisions require a non-empty note in UI, API, and store; the audit event records the supplied note.
- P1 fixed: `npm run lint` is non-interactive.
- P1 fixed: public artifact hygiene rules were expanded in `.gitignore`.
- P1 fixed: citizen status/urgency badges accept locale and were verified on Malay and Chinese status pages.
- P1 documented: dependency audit cannot be safely cleared without a forced Next.js major upgrade.

## 3. Commands Run and Results

- `npm run typecheck` - PASS.
- `npm test -- tests/lifecycle.test.ts` - initially FAIL as expected before implementation; PASS after fixes.
- `npm test` - PASS, 6 files / 29 tests.
- `npm run lint` - PASS; now runs `tsc --noEmit`.
- `npm run build` - PASS.
- `npm audit --omit=dev --audit-level=moderate` - FAIL remains; see `docs/audit/dependency_risk_note.md`.
- Production launch: `npm run start -- --hostname 127.0.0.1 --port 3003` - PASS; `/m` and `/api/cases` returned HTTP 200.
- Live API probe: pending flood-risk `POST /api/cases/[id]/status` to `in_progress` returned HTTP 400 with `Supervisor approval required before work can start.`
- Live API probe: approval without note returned HTTP 400 with `Decision note is required.`
- Browser validation: `/officer`, officer case detail pages, and citizen status pages rendered with no console errors or framework overlay. Browser screenshot capture timed out twice, so visual proof relied on DOM, URL/title, console, and interaction checks.

## 4. Remaining Risks

- `npm audit --omit=dev --audit-level=moderate` still reports advisories in `next` and nested `postcss`; npm only offers a forced breaking upgrade to Next `16.2.9`.
- Role separation remains demo-only and client-supplied; this is acceptable for the hackathon demo but not production RBAC.
- There is no full missing-info resolution or eligibility-decision endpoint; the generic status endpoint now fails closed instead of inventing those workflows.
- Browser screenshot capture failed in the in-app Browser, although DOM, console, API, and interaction checks passed.

## 5. Exact Demo Verification Steps

### Malay blocked-drain high-risk approval

1. Open `http://127.0.0.1:3003/m`.
2. Choose Bahasa Melayu and submit: `Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.` with location `Jalan SS2`.
3. Confirm the citizen status is `Menunggu penyelia` and urgency is `Semakan risiko banjir`.
4. Open the officer case detail.
5. Confirm `Supervisor approval required before work can start.` is visible and `Start work` / `Close case` are not shown.
6. Enter a decision note, approve as supervisor, and confirm the case can move to `in_progress`.

### Chinese business licence needs-info flow

1. Open `http://127.0.0.1:3003/m`.
2. Choose Chinese and submit the business licence example without location, business type, or operating hours.
3. Confirm the citizen status uses Chinese labels such as `需要信息`.
4. Open the officer case detail.
5. Confirm the missing-info blocker is visible and normal `Start work` / `Close case` actions are not shown.

### English education/welfare officer-review flow

1. Open `http://127.0.0.1:3003/m`.
2. Choose English and submit: `Can I apply for education aid for my child?`
3. Open the officer case detail.
4. Confirm it says eligibility is officer-reviewed / no auto-approval.
5. Confirm `Start officer review` is available, but `Close case` is not available through the generic action.

### Zero-citation manual-review fallback

1. Open `http://127.0.0.1:3003/m`.
2. Submit: `Hello, I have a question.`
3. Confirm the persisted status is `manual_review`.
4. Open the officer case detail.
5. Confirm `Manual review required because no reliable policy citation was found.` is visible.
6. Confirm normal `Start work` / `Close case` actions are not shown.
