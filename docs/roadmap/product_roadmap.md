# CivicFlow MY Mobile - Product Roadmap

## Positioning

CivicFlow MY Mobile starts as a public hackathon demo, but the product direction is a governed integration layer for Malaysian public-service casework. It should not replace a council's existing apps, databases, case-management systems, GIS tools, work-order tools or citizen notification channels. Instead, CivicFlow should sit between citizens, officers and existing agency systems so AI can structure intake, retrieve policy evidence, recommend routing, enforce human approval gates and preserve audit evidence.

The current repository remains a synthetic demo. The roadmap below describes the path from demo to real product and must not be read as a claim that live government integrations, real SOPs or real citizen data are already connected.

## North Star and Submission Gate

**Product North Star:** three of three canonical journeys must run from citizen intake to a citizen-visible, policy-cited, human-owned and audited outcome, with zero unsafe bypasses.

The MAIC submission deadline is **2026-09-01 00:00 MYT**. The English 179-second video is locally verified and publicly released with no login wall. The public no-login application deployment and completed submission-portal record remain external delivery gates until each is verified directly.

## Phase 0 - Current Hackathon Artifact

The current artifact demonstrates the core civic workflow with synthetic data:

- Mobile citizen app for Malay, English, Chinese and Tamil requests.
- Officer console with case queue, case detail, citations, reply drafts and audit timeline.
- Supervisor approval queue for high-risk cases.
- Deterministic RAG over six synthetic policy documents.
- Citation-or-manual-review guardrail.
- Three canonical journeys: Malay flood-risk drainage, Chinese business-licence follow-up in the same case, and English education/welfare review.
- Blocked unsafe transitions for high-risk, needs-info, welfare/education and uncited cases.
- Separate officer review, reply release, supervisor decision, work start and note-gated closure actions.
- A mandatory human welfare-outcome gate before an education/welfare case can advance through the outcome-sensitive path.
- Production build, unit tests, dependency audit and browser smoke evidence for the demo.

This phase proves the workflow logic: AI drafts, humans decide and every case is traceable.

**Current verified product status (2026-08-02).** Local evidence covers all three canonical journeys and their governance checks. The Malay drainage case preserves policy evidence and the reviewed reply through officer review, supervisor approval, reply release, work start and human closure. The Chinese licence journey resolves missing details in the same case, returns the new revision to officer review and completes the separated release/start/close path. The education/welfare journey requires a human-recorded outcome and never creates an AI eligibility decision. Citation-or-manual-review, denied-transition audit events and separate consequential actions remain hard boundaries. A real-UI English demo video is verified at `179.000000` seconds and publicly available from the MAIC preliminary GitHub release. There is still no production identity, tenancy, persistent database, live agency adapter, verified public application deployment or completed portal submission.

## Phase 1 - 0 to 90 Days: Outcome-Gated Pilot Foundation

The first product step is to preserve the narrow product thesis and earn the right to pilot. Each milestone is an outcome gate, not a feature-count target.

### Day 0-30 - Submission truth and repeatable product proof

- Freeze new product scope and re-prove all three canonical journeys on the exact submission tree.
- Keep the acceptance bar at three of three citizen-visible, policy-cited, human-owned and audited outcomes with zero unsafe bypasses.
- Refresh the English summary, disclosure, 12-page deck and current UI evidence around the same product story.
- Build and verify a nominal 179-second English demo video whose actual container duration is below 180 seconds.
- Configure and smoke-test a stable public no-login demo URL; do not claim deployment before direct verification.
- Complete the MAIC portal fields and capture submission confirmation before **2026-09-01 00:00 MYT**.

Expected outcome: a truthful, reproducible submission package. The public repository, release artifacts and video URL now exist; submission delivery remains incomplete until the public application deployment and portal confirmation are directly verified.

### Day 31-60 - One-agency trust boundary

- Replace the in-memory store with a persistent database designed around `agency_id` / `pbt_id` tenancy.
- Replace client-asserted role strings with server-owned officer, supervisor and admin identity plus least-privilege access control.
- Add agency configuration for departments, service categories, approval policies, SLA targets and supported languages.
- Add policy versioning, controlled SOP onboarding, authenticated reset/administration, retention rules, access logging and audit export.
- Establish the pilot privacy and security baseline now: approved-data boundaries, backups, monitoring, rate limiting, recovery and incident ownership.

Expected outcome: one isolated agency environment with attributable human decisions and controlled policy/data lifecycle, still using synthetic or formally approved data only.

### Day 61-90 - Controlled pilot readiness

- Select one public-service desk and a narrow set of service categories.
- Integrate one agency-owned system of record and one approved notification path, selected from validated partner needs rather than a connector catalogue.
- Measure triage time, first-response completeness, citation coverage, officer override rate, manual-review volume and unsafe-bypass count before setting performance claims.
- Run multilingual regression and retrieval evaluation against the approved pilot corpus.
- Add hosted release, recovery and rollback gates for the controlled environment.

Expected outcome: a controlled-pilot candidate for one service desk, with measurable workflow value and no transfer of consequential decisions to AI.

## Phase 2 - 3 to 6 Months: First Agency Pilot

The first real deployment should be narrow: one council, campus, township operator or civic service desk with a defined set of service categories.

Key work:

- Validate one partner workflow before expanding integration breadth.
- Deepen the selected system-of-record and notification integrations with reconciliation, failure handling and audit evidence.
- Add work-order, GIS / asset, document or identity adapters only when the validated service journey requires them.
- Keep approved field-work requests behind the agency's authorised work-order or dispatch system, never directly from AI.
- Add an SLA view for backlog, pending approvals, needs-info cases, manual-review volume, department load and overdue-risk cases.

Expected outcome:

- A controlled pilot where CivicFlow improves intake, routing, SLA visibility and auditability while human officers retain every consequential decision.

## Phase 3 - 6 to 12 Months: Multi-Agency Platform

After one pilot validates workflow value, the platform should become multi-agency without mixing data or policies across agencies.

Key work:

- Multi-agency tenancy with isolated data, policy corpora, users, departments, routing rules and audit logs.
- Connector registry so each agency can map its own apps, databases, SOP folders and notification channels.
- Policy source governance: source version tracking, stale-policy warnings, citation confidence review and human policy-owner approval before publication.
- Multilingual Service Equity Auditor:
  - compare Malay, English, Chinese and Tamil versions of the same request;
  - flag inconsistent category, routing, citation, missing-info or approval outcomes;
  - produce a language-equity score for civic-tech accountability.
- Production RAG upgrade with real embeddings, retrieval evaluation and regression tests against approved agency corpora.
- Immutable audit export for internal review, external audit and public-sector accountability reporting.

Expected outcome:

- CivicFlow becomes a reusable public-service AI operations layer across multiple PBTs, agencies, campuses or civic service operators.

## Phase 4 - 12 to 18 Months: Production-Governance Readiness

This phase prepares CivicFlow for procurement-grade and production-grade public-service operation.

Key work:

- Extend the Phase 1 privacy and security baseline to procurement-grade assurance, data-processing agreements and independent testing.
- Formalise operational resilience: monitored backups, alerting, incident response, penetration testing and privileged-admin controls.
- Model governance: prompt/version registry, deterministic fallback checks, regression evaluation, multilingual quality tests and override analytics.
- Human oversight governance: configurable approval policies, supervisor review queues, eligibility safeguards and blocked-action logs.
- Agency rollout playbook: data onboarding, connector setup, officer training, approval-policy configuration, go-live checklist and support model.
- Commercial packaging based on evidence from the first controlled pilot rather than pre-pilot pricing assumptions.

Expected outcome:

- A governed, auditable and integration-ready platform for Malaysian public-service operators.

## Product Boundary

CivicFlow should not become a generic chatbot or a generic enterprise agent platform. It should stay focused on public-service casework:

- Intake citizen requests.
- Ground recommendations in cited policies.
- Route cases to the right department.
- Detect missing information.
- Gate high-risk and eligibility-sensitive cases for human review.
- Draft replies for officer approval.
- Sync with authorised government or agency systems.
- Preserve audit evidence.

AI must not autonomously close cases, approve high-risk escalation, dispatch field teams, decide eligibility or bypass agency-owned systems of record.
