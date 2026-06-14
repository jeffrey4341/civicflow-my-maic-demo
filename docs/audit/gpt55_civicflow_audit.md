# GPT 5.5 CivicFlow MY Audit

## 1. Executive Verdict

**Close, but needs fixes.**

CivicFlow MY Mobile is clearly pointed at MAIC Nexus Challenge T5: Public Services & Smart Cities, not a generic chatbot. The main demo story is strong: multilingual citizen intake, deterministic triage, RAG citations, routing, approval tasks, reply drafts, and audit history all exist and run locally.

Do **not** submit yet. The app currently lets an officer start or close a high-risk `awaiting_supervisor` case while the supervisor approval task is still pending. That directly contradicts the highest-value governance claim: high-risk cases require supervisor approval before action.

## 2. Scorecard

| Area | Score |
| --- | ---: |
| T5 alignment | 4.5 / 5 |
| Mobile demo quality | 4.0 / 5 |
| Citizen workflow completeness | 4.0 / 5 |
| Officer workflow completeness | 3.5 / 5 |
| RAG/citation quality | 4.0 / 5 |
| Approval/audit quality | 2.5 / 5 |
| Privacy/public-demo safety | 4.0 / 5 |
| Code quality | 3.5 / 5 |
| Submission readiness | 3.0 / 5 |
| Commercial/pitch clarity | 4.0 / 5 |

## 3. Critical Findings

1. **Supervisor approval can be bypassed.**
   - Evidence: a live API probe created the Malay flood-risk case with `status: awaiting_supervisor` and `approval_task_id: appr_b480c7acc64d`, then `POST /api/cases/[id]/status` with `status: closed` succeeded while the approval remained pending.
   - UI evidence: `/officer/cases/[id]` for the same pending case displayed `Start work (in progress)` and `Close case` next to `Approve` / `Reject`.
   - Files likely involved: `src/components/officer/StatusActions.tsx`, `src/app/api/cases/[id]/status/route.ts`, `src/lib/store.ts`.
   - Why it matters: judges will punish a governance demo whose key approval gate is presentation-only.

2. **Lifecycle transitions are too permissive beyond approvals.**
   - Evidence: the Chinese licensing case in `needs_info` still displayed `Start work (in progress)` and `Close case`.
   - Evidence: `setStatus()` accepts any `CaseStatus` in `CASE_STATUS_ORDER`; the API route validates only that the value is a known enum.
   - Why it matters: required missing information and officer-review-only states should not behave like normal routed work.

3. **Manual-review fallback is not explicit enough when citations fail.**
   - Evidence: submitting `Hello, I have a question.` produced `category: general_enquiry`, `confidence: 0.2`, `citations: []`, but persisted `status: routed` to `Customer Service / Front Desk`.
   - The reply says an officer will review manually, so it is not hallucinating policy, but the status model still looks like normal routing.
   - Why it matters: the hard rule says "citation or manual review." The app needs a visible, non-actionable manual-review state or status reason.

## 4. Serious Findings

1. **Approval decision notes are optional.**
   - Evidence: approval UI placeholder is `Decision note (optional)...`; API defaults to `Approved.` / `Rejected.` if no note is supplied.
   - Fix before demo recording: require a reason for approve/reject, at least for high-risk cases.

2. **Role separation is demo-only and client supplied.**
   - Evidence: approval decisions post `decided_by: "Supervisor Lim (demo)"` and `decided_role: "supervisor"` from the client.
   - This is acceptable only if presented as a demo boundary. It must not be implied as real RBAC.

3. **Dependency audit currently fails.**
   - `npm audit --omit=dev --audit-level=moderate` reported production-path advisories in `next` and `postcss`.
   - Full `npm audit --audit-level=moderate` also reported `vitest`/`vite`/`esbuild` advisories in dev dependencies.
   - For a public submission repo, this is embarrassing even if the demo is not production.

4. **Lint is not a runnable gate.**
   - `npm run lint` opens the first-time Next ESLint setup prompt and exits non-zero instead of producing a CI-safe pass/fail result.

5. **Public artifact hygiene is not clean yet.**
   - The local folder contains generated/tooling artifacts: `.next`, `node_modules`, `.claude`, and `tsconfig.tsbuildinfo`.
   - `.gitignore` does not ignore `*.tsbuildinfo` or `.claude/`.
   - No `.git` repo exists in this folder, so I could not verify tracked/untracked publish state.

## 5. Moderate Findings

1. **Some citizen-facing status labels are not localized.**
   - Chinese status page shows `Normal` and `Needs information`.
   - Malay status page shows `Flood-risk review`.
   - The i18n strings exist, but `StatusBadge` / `UrgencyBadge` default to English in citizen pages.

2. **The citizen optional-clarification copy can read as required.**
   - Malay flood-risk details screen labels optional questions under `Maklumat masih diperlukan`.
   - This can make citizens think optional follow-up is blocking submission.

3. **Officer console is workflow-capable but desktop-table oriented.**
   - The citizen app is mobile-first. The officer queue is a table and is fine for desktop demo, but not mobile-friendly.

4. **RAG confidence is visible but relatively low for important citations.**
   - Example: licensing top citations were 49% and 36%; drainage second citation was 35%.
   - This is not a blocker for a synthetic demo, but the UI should frame confidence as retrieval confidence, not policy truth.

5. **Tenant/agency separation is mostly absent.**
   - CivicFlow is single-agency (`Majlis Demo`) rather than multi-tenant.
   - That is a reasonable simplification for T5, but it means the old "horse stable" tenant/agency boundary was mostly not preserved.

## 6. Minor Findings

1. README project tree shows `app/` and `lib/`, but the actual repo uses `src/app` and `src/lib`.
2. The citizen app exposes an `Officer view` link. Useful for demo, but odd for a public citizen product unless labeled as demo navigation.
3. Chinese reply text is understandable but needs polish; one example says `我们的目标是在在约 14 个工作日内回复`.
4. `.env.example` is safe, but public submission packaging should ensure no real `.env` file is included.

## 7. Demo Case Verification

### Case 1: Malay blocked-drain / flood-risk

**Verdict: Partial.**

Evidence:
- Live API with `Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.` returned:
  - `detected_language: ms`
  - `category: drainage`
  - `urgency: flood_risk`
  - `department: Engineering`
  - `unit: Drainage Unit`
  - `status: awaiting_supervisor`
  - pending `approval_task_id`
  - citations from `drainage_response_sop.md`
  - Malay reply draft
  - audit events: `case.created`, `ai.language_detected`, `ai.classified`, `rag.retrieved`, `ai.routed`, `ai.missing_info`, `approval.requested`, `reply.drafted`, `approval.created`, `status.changed`

Missing pieces:
- Officer can still click `Start work` or `Close case` before supervisor approval.
- API also allows the same bypass.

Exact fix recommendation:
- Enforce transition guards in `src/lib/store.ts` and the status route.
- Hide or disable status actions in `src/components/officer/StatusActions.tsx` until approval is approved.
- Add regression tests proving pending high-risk cases cannot move to `in_progress` or `closed`.

### Case 2: Chinese business licence query

**Verdict: Pass, with UX polish needed.**

Evidence:
- Live API with `我要申请小食档执照，需要什么文件？` returned:
  - `detected_language: zh`
  - `category: business_licensing`
  - `department: Licensing`
  - `unit: Licensing Unit`
  - `status: needs_info`
  - citations from `business_licensing_faq.md`
  - missing required fields: `location`, `business_type`, `operating_hours`
  - Chinese reply draft including `lesen perniagaan / business licence`
- Officer case page displays Business Licensing FAQ citations, missing-info checklist, draft reply, and audit timeline.

Missing pieces:
- Citizen status badge/urgency text still leaks English labels.
- Needs-info case can still be manually advanced/closed by generic status buttons.

Exact fix recommendation:
- Localize citizen `StatusBadge` / `UrgencyBadge`.
- Block or require explicit audited override before advancing `needs_info` cases.

### Case 3: English education / welfare aid pre-screen

**Verdict: Pass, with transition hardening needed.**

Evidence:
- Live API with `Can I apply for education aid for my child?` returned:
  - `category: education_aid_welfare`
  - `department: Community & Welfare`
  - `unit: Education Support Unit`
  - welfare policy citations
  - optional document checklist: birth certificate, school enrolment, household income evidence
  - reply draft explicitly says eligibility is decided by a welfare officer and is not automatic approval.
- Officer case page shows "No supervisor approval required. Eligibility is decided by an officer (no auto-approval)."

Missing pieces:
- Officer can still close or start the case with generic status buttons.
- No test proves education/welfare cannot be treated as auto-approved through status mutation.

Exact fix recommendation:
- Add `officer_review_only` or `eligibility_review_required` state/flag to case state and enforce it before closure.

## 8. Mobile UX Review

Strengths:
- Citizen route `/m` uses a centered phone shell around 416px wide.
- Clear language selection for Malay, English, Chinese, and Tamil.
- Submit flow is simple: language -> describe request -> AI triage/details -> submit.
- Demo examples are strong and match the three core cases.
- Photo and location mocks are present.
- Missing-info questions appear before submit.
- Created case page shows tracking code and status milestones.
- Reply page exists and is gated on officer release.
- Synthetic-data warning is visible.

Fix list:
- Localize citizen badges and current status/urgency labels.
- Rename optional follow-up section so optional drainage questions do not look blocking.
- Consider showing a location field before AI analysis, not only a mock button or required-field prompt after analysis.
- Hide or clearly label `Officer view` as demo navigation.
- Add one mobile smoke/e2e test for the full citizen submission flow.

## 9. Officer Console Review

Strengths:
- `/officer` has a real case queue with category, urgency, department, status, language, and links.
- `/officer/cases/[id]` has citizen request, AI triage, routing rationale, confidence, missing-info panel, SOP citations, reply draft, supervisor approval, and audit timeline.
- `/officer/approvals` has pending/decided approval queues with evidence.
- `/officer/audit` shows global audit events.

Fix list:
- Remove or disable `Start work` / `Close case` until lifecycle preconditions are met.
- Require approval notes for approve/reject.
- Separate officer vs supervisor actions more explicitly in UI.
- Do not let a `needs_info` case advance without explicit audited override or supplied missing info.
- Add tests for officer actions, not just deterministic AI functions.

## 10. RAG, Approval, Audit Review

RAG:
- Synthetic policy corpus exists under `data/policies/`.
- Policy docs have citeable `##` sections.
- `PolicyCitation` includes `source_doc`, `doc_title`, `section`, `snippet`, and `confidence`.
- Citations are visible in the officer UI and included in reply drafts.
- Retrieval is deterministic and offline.

Gaps:
- Audit timeline summary does not expose citation payload details inline; citations are in event payloads and the separate citation panel, not visibly linked per audit event.
- Zero-citation fallback still persists as `routed`; manual review needs a first-class state or prominent status reason.

Approval:
- Approval task creation works for flood-risk drainage.
- Self-approval and wrong-role approval are blocked inside `decideApproval()`.
- But status mutation bypasses the approval gate entirely.

Audit:
- The pipeline emits audit events for creation, language detection, classification, retrieval, routing, missing-info detection, approval request, reply draft, approval creation, and status changes.
- Audit is append-only in practice for the in-memory store.
- Missing governance: invalid/unsafe transition attempts should be rejected and ideally audited as denied attempts.

## 11. Privacy and Public Artifact Safety

Safe to make public **after cleanup and dependency/governance fixes**.

Evidence:
- `README.md`, `AI_DISCLOSURE.md`, `DATA_CARD.md`, `MODEL_CARD.md`, `THIRD_PARTY_NOTICES.md`, and `docs/privacy/privacy_controls.md` exist.
- Docs repeatedly state all data is synthetic and no real citizen data, SOPs, NRIC, phone numbers, or addresses are included.
- Secret scan with ripgrep found no real keys or credentials; only documented placeholder references such as `ANTHROPIC_API_KEY=`.
- The optional LLM path is disclosed and disabled unless an API key is supplied.
- No HR/Sales/Finance/ERP data model leaked into the CivicFlow app.

Risks:
- Public package should exclude `node_modules`, `.next`, `.claude`, and `tsconfig.tsbuildinfo`.
- Current dependency advisories should be fixed or risk-accepted in writing before publishing.
- The app is not production privacy/security safe; docs correctly say this, but the live UI should not imply production readiness.

## 12. Code and Test Results

Commands run:

| Command / check | Result |
| --- | --- |
| `node --version; npm --version; npm ls --depth=0` | PASS. Node `v24.14.0`, npm `11.6.2`; dependencies installed. |
| `npm run typecheck` | PASS. `tsc --noEmit` completed. |
| `npm test` | PASS. 5 test files, 21 tests passed. |
| `npm run lint` | FAIL. `next lint` opened the first-time ESLint configuration prompt and exited non-zero. |
| `npm run build` | PASS. Next production build completed. |
| `npm run dev -- --hostname 127.0.0.1 --port 3001` | PASS. Dev server returned HTTP 200. |
| `npm run start -- --hostname 127.0.0.1 --port 3002` after dev had overwritten `.next` | FAIL. Could not find production build ID. |
| Re-run `npm run build`, then `npm run start -- --hostname 127.0.0.1 --port 3002` | PASS. Production server returned HTTP 200 and was stopped. |
| `npm audit --omit=dev --audit-level=moderate` | FAIL. Runtime-path advisories reported in `next` and `postcss`. |
| Full `npm audit --audit-level=moderate` | FAIL. Also reported dev-path advisories in `vitest`/`vite`/`esbuild`. |
| Browser inspection `/m` and `/officer/*` | PASS for rendering. No console errors observed on inspected pages. |
| API demo-case smoke | PASS for the three expected demo cases. |
| API approval-bypass probe | FAIL. Pending high-risk case could be closed through status endpoint. |

## 13. Reference Repo Mapping

What survived:
- Role-aware surfaces: citizen mobile app, officer console, supervisor approval queue, audit view.
- RAG citations: policy corpus, section snippets, confidence, citation UI.
- Approval gates: high-risk drainage creates supervisor task.
- Audit timeline: each AI/human/system action appends an event.
- Model-draft + human-decision framing: reply drafts and routing recommendations are not auto-sent.
- Deterministic fallback: demo runs offline with no API key.
- Synthetic demo data and public safety docs.

What was simplified correctly:
- No enterprise kernel, tool broker, ERP connector, finance/AP workflow, or broad agent platform.
- Single Next.js app and in-memory store are appropriate for a hackathon demo.
- Reference concepts are documented as concepts only in `docs/reference/source_mapping.md`.

What was lost:
- Strong fail-closed enforcement for approval-gated transitions.
- Tenant/agency separation.
- Server-owned identity/RBAC. Roles are demo strings supplied by the client.
- Tool/policy broker style enforcement. CivicFlow has rule functions, not a central policy enforcement layer.

What should not be copied back:
- Enterprise finance/AP modules, ERP/payment/banking concepts, broad Agent OS language, model-provider gateway complexity, and tool broker infrastructure. They would make this T5 demo feel generic and overbuilt.

Bottom line:
- The "horse stable" concept survives as a civic-tech workflow stable, but the gate doors are not locked yet. Fix status transition enforcement before submission.

## 14. Required Fix Plan

### P0: must fix before submission

1. **Enforce approval-gated status transitions server-side.**
   - Owner suggestion: Codex
   - Complexity: M
   - Files likely affected: `src/lib/store.ts`, `src/app/api/cases/[id]/status/route.ts`, `tests/approval.test.ts`
   - Acceptance criteria: pending `awaiting_supervisor` cases cannot move to `in_progress` or `closed`; API returns 400/403; approved cases can move forward; denied attempts are tested.

2. **Hide/disable unsafe officer status buttons.**
   - Owner suggestion: Codex
   - Complexity: S
   - Files likely affected: `src/components/officer/StatusActions.tsx`, `src/app/officer/cases/[id]/page.tsx`
   - Acceptance criteria: pending approval case shows "Supervisor approval required" instead of `Start work` / `Close case`; needs-info case does not show normal start/close actions.

3. **Make manual-review fallback first-class.**
   - Owner suggestion: Codex
   - Complexity: M
   - Files likely affected: `src/lib/types.ts`, `src/lib/ai/pipeline.ts`, `src/lib/store.ts`, officer/citizen status pages, tests
   - Acceptance criteria: zero-citation or low-confidence output is visibly marked `manual_review` or equivalent; no normal actionable routing appears without citation; officer UI explains the fallback.

4. **Add lifecycle regression tests.**
   - Owner suggestion: Codex
   - Complexity: M
   - Files likely affected: `tests/approval.test.ts`, new store/API tests
   - Acceptance criteria: tests cover approval bypass, missing-info advancement, education/welfare no-auto-approval, and zero-citation manual-review fallback.

### P1: must fix before demo recording

1. **Require approval decision notes.**
   - Owner suggestion: Codex
   - Complexity: S
   - Files likely affected: `src/components/officer/ApprovalActions.tsx`, `src/app/api/approvals/[id]/route.ts`, tests
   - Acceptance criteria: approve/reject without a note is blocked; audit records the supplied note.

2. **Fix lint so it is non-interactive.**
   - Owner suggestion: Codex
   - Complexity: S
   - Files likely affected: ESLint config/package scripts
   - Acceptance criteria: `npm run lint` exits 0/1 without prompts.

3. **Resolve or explicitly risk-accept dependency advisories.**
   - Owner suggestion: Codex + Human
   - Complexity: M/L depending on Next upgrade
   - Files likely affected: `package.json`, `package-lock.json`
   - Acceptance criteria: `npm audit --omit=dev --audit-level=moderate` passes, or a documented risk exception exists for demo-only submission.

4. **Localize citizen status and urgency badges.**
   - Owner suggestion: Claude or Codex
   - Complexity: S
   - Files likely affected: `src/components/ui.tsx`, citizen pages
   - Acceptance criteria: Malay/Chinese/Tamil citizen pages do not show English status/urgency labels unless intentionally bilingual.

### P2: should fix before semi-finals

1. **Add a minimal agency/tenant field.**
   - Owner suggestion: Claude
   - Complexity: M
   - Files likely affected: `src/lib/types.ts`, seed data, UI, docs
   - Acceptance criteria: cases are scoped to `agency_id` / `pbt_id` such as `majlis-demo`; docs explain single-tenant demo mode vs future multi-agency deployment.

2. **Clean submission artifacts.**
   - Owner suggestion: Codex
   - Complexity: S
   - Files likely affected: `.gitignore`, packaging docs
   - Acceptance criteria: `node_modules`, `.next`, `.claude`, and `*.tsbuildinfo` are excluded from public package/repo.

3. **Add browser smoke tests.**
   - Owner suggestion: Codex
   - Complexity: M
   - Files likely affected: test/e2e setup
   - Acceptance criteria: e2e covers `/m` submit, `/officer` queue, case detail, approval, audit, and reply release.

4. **Update README project structure.**
   - Owner suggestion: Claude
   - Complexity: S
   - Files likely affected: `README.md`
   - Acceptance criteria: docs show `src/app` and `src/lib`, not root `app`/`lib`.

### P3: optional polish

1. Polish Chinese reply wording.
   - Owner suggestion: Human or Claude
   - Complexity: S
   - Files likely affected: `src/lib/ai/reply.ts`, `src/lib/i18n.ts`
   - Acceptance criteria: Chinese reply reads naturally and avoids duplicate particles like `在在`.

2. Re-label citizen demo navigation.
   - Owner suggestion: Claude
   - Complexity: S
   - Files likely affected: `src/app/m/layout.tsx`, citizen status pages
   - Acceptance criteria: `Officer view` is clearly marked as demo-only or moved out of citizen-primary flow.

3. Improve retrieval confidence explanation.
   - Owner suggestion: Claude
   - Complexity: S
   - Files likely affected: `src/components/ui.tsx`, officer case page
   - Acceptance criteria: UI says confidence is retrieval-match confidence, not official policy confidence.

## 15. Final Recommendation

Continue with this T5 direction. Do not pivot.

This is a real civic-tech workflow demo, not merely a dressed-up chatbot. The implementation has the right shape for public services: multilingual citizen intake, casework routing, RAG citations, missing-info handling, approval tasks, draft replies, and audit evidence.

But do not submit or record the final demo until the P0 governance fixes are done. The current approval/status bypass is exactly the kind of flaw that can make judges doubt the entire "human-in-the-loop" claim.
