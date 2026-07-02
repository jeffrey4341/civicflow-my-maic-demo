# CivicFlow MY Mobile - Product Roadmap

## Positioning

CivicFlow MY Mobile starts as a public hackathon demo, but the product direction is a governed integration layer for Malaysian public-service casework. It should not replace a council's existing apps, databases, case-management systems, GIS tools, work-order tools or citizen notification channels. Instead, CivicFlow should sit between citizens, officers and existing agency systems so AI can structure intake, retrieve policy evidence, recommend routing, enforce human approval gates and preserve audit evidence.

The current repository remains a synthetic demo. The roadmap below describes the path from demo to real product and must not be read as a claim that live government integrations, real SOPs or real citizen data are already connected.

## Phase 0 - Current Hackathon Artifact

The current artifact demonstrates the core civic workflow with synthetic data:

- Mobile citizen app for Malay, English, Chinese and Tamil requests.
- Officer console with case queue, case detail, citations, reply drafts and audit timeline.
- Supervisor approval queue for high-risk cases.
- Deterministic RAG over six synthetic policy documents.
- Citation-or-manual-review guardrail.
- Blocked unsafe transitions for high-risk, needs-info, welfare/education and uncited cases.
- Production build, unit tests, dependency audit and browser smoke evidence for the demo.

This phase proves the workflow logic: AI drafts, humans decide and every case is traceable.

**Verification status (2026-07-02, Fable 5 follow-up).** Phase 0 re-verified green after the P1 public-demo fixes: `npm run typecheck` PASS, `npm test` 48/48 PASS across 9 files, `npm run build` PASS, `npm audit --omit=dev --audit-level=moderate` 0 vulnerabilities, `npm run smoke:e2e` PASS (11 browser checks on a self-started production server at 127.0.0.1:3012). Local production launch was also checked with `npm run start -- --hostname 127.0.0.1 --port 3015`; `/`, `/m`, `/officer`, `/officer/approvals`, `/officer/audit`, `/api/cases`, and `/api/audit` all returned HTTP 200, then the temporary server was stopped. CF-03, CF-04, and CF-05 are complete for the public demo: LLM confidence no longer bypasses low-confidence default-deny, RAG off-topic queries fall back instead of citing by category boost alone, citizen UI controls/AI labels are more legible and labelled, and the officer console has visible mobile navigation plus horizontally scrollable tables. Phases 1–4 have no code yet (no tenancy/auth/DB/adapters in `src/`), as this roadmap already states. The hosted public demo URL remains the externally blocked P0: no hosting config exists in the repo and a hosted URL requires owner action outside it. Full audit record: `docs/audit/fable5_system_audit_2026-07-02.md`.

## Phase 1 - 0 to 90 Days: Pilot-Ready Foundation

The first product step is to make CivicFlow credible for a controlled pilot without claiming full government production readiness.

Key work:

- Host a stable public demo and a private pilot environment with deployment verification.
- Replace the in-memory store with a persistent database designed around `agency_id` / `pbt_id` tenancy.
- Add production-grade identity boundaries for officers, supervisors and admins, replacing demo role strings.
- Add an agency configuration model for departments, service categories, approval policies, SLA targets and supported languages.
- Build an SOP onboarding workflow so an agency can upload approved SOPs, FAQs, service charters and routing rules into a controlled policy corpus.
- Add a compliance gate panel that shows whether each case has citations, missing information, approval requirements, manual-review flags and audit evidence.
- Keep deterministic fixtures for demo/review while adding a production path for approved pilot data.
- Add release gates for typecheck, tests, production build, browser smoke, dependency audit and hosted URL smoke.

Expected outcome:

- A pilot-ready SaaS-style environment for one agency, still using approved or synthetic data until formal data-processing approval exists.

## Phase 2 - 3 to 6 Months: First Agency Pilot

The first real deployment should be narrow: one council, campus, township operator or civic service desk with a defined set of service categories.

Key work:

- Connect CivicFlow to each agency's existing systems through adapters rather than hardcoded integrations.
- Case-management adapter: create, update and sync cases with the agency's current ticketing or CRM system.
- Work-order adapter: pass approved field-work requests to the authorised work-order or dispatch system, never directly from AI.
- GIS / asset adapter: map drainage assets, roads, facilities, zones or service areas from approved agency datasets.
- Notification adapter: send officer-approved citizen updates through existing email, SMS, WhatsApp, push notification or citizen-app channels.
- SOP / document adapter: ingest approved PDFs, markdown, CMS pages or database records with source versioning.
- SSO / identity adapter: integrate council or agency identity provider for officers and supervisors.
- SLA dashboard: show backlog, pending approvals, needs-info cases, manual-review volume, department load and overdue-risk cases.

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

- PDPA-aligned privacy controls, retention policies, access logs and data-processing agreements.
- Security hardening: rate limiting, backups, monitoring, alerting, incident response, penetration testing and admin controls.
- Model governance: prompt/version registry, deterministic fallback checks, regression evaluation, multilingual quality tests and override analytics.
- Human oversight governance: configurable approval policies, supervisor review queues, eligibility safeguards and blocked-action logs.
- Agency rollout playbook: data onboarding, connector setup, officer training, approval-policy configuration, go-live checklist and support model.
- Commercial packaging: paid pilot, department subscription, usage-based case volume tier and enterprise multi-agency deployment.

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
