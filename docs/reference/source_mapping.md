# Source Mapping — Reusable Concepts Adapted from the Reference Architecture

This document records how **CivicFlow MY Mobile** (a MAIC Nexus Challenge T5 public hackathon demo) reuses **architectural concepts** — and only concepts — adapted from a private enterprise reference repository (name withheld from this public artifact). It exists for transparency: judges, reviewers, and contributors should be able to see exactly what was conceptually borrowed, how it was reimplemented for the citizen-service domain, and what was deliberately left behind.

> **Hard rule, stated up front:** No source code was copied from the reference repository. No secrets, credentials, environment files, or proprietary enterprise modules were imported. Every concept below was re-derived and reimplemented from scratch for the local-council casework domain, and all data in this repo is 100% synthetic.

---

## 1. Context

CivicFlow MY Mobile is **not** a generic chatbot and **not** a generic "Enterprise Agent OS." It is a focused, mobile-first, multilingual **citizen-service workflow / casework layer** for Malaysian local councils (Pihak Berkuasa Tempatan / PBT). Citizens submit service requests in Malay, English, Chinese, or Tamil; the system detects language, classifies the case, retrieves SOP/FAQ/service-charter citations, routes to the correct department, triggers supervisor approval for high-risk cases, drafts a multilingual reply, and records a full audit timeline.

The private reference repo is an enterprise agent platform built around horizontal patterns — role-aware workflow, retrieval with citations, approval gates, and audit trails — that apply across many business domains. Those *patterns* are domain-neutral and reusable. The CivicFlow demo takes the **shape** of those patterns and reimplements them, in TypeScript, for a single vertical: PBT casework. The AI **drafts** recommendations; officers and supervisors **decide**. High-risk cases **require** human approval.

The entire AI/RAG layer is **deterministic TypeScript** that runs fully offline against fixtures. An optional Anthropic LLM path is used **only** when an `ANTHROPIC_API_KEY` is present; otherwise the deterministic fallback produces identical-shape structured output. The demo always runs with no API key.

---

## 2. Concept Mapping Table

| Reference concept (private repo) | CivicFlow reimplementation (this repo) | CivicFlow file / module (planned) |
| --- | --- | --- |
| **Role-aware workflow** — actors with distinct permissions move work through a state machine | Citizen vs. officer vs. supervisor roles drive the `CitizenCase` lifecycle (`draft → needs_info → submitted → routed → awaiting_supervisor → in_progress → closed`). Citizen mobile route `/m`; officer console `/officer/*`. Routing recommendations are produced by AI; transitions that matter are gated to humans. | `src/lib/ai/pipeline.ts`, `src/lib/types.ts` |
| **RAG-with-citations** — every retrieved claim carries a verifiable source reference | Policy retrieval returns `PolicyCitation` objects with `source_doc`, `section`, `snippet`, and `confidence`, drawn from synthetic policy documents with cited section headings. No answer is presented without its citation. | `src/lib/rag/retrieve.ts`, `src/lib/types.ts` |
| **Approval gates with no self-approval** — high-risk actions require a second, distinct human | High-risk cases (e.g. drainage / flood-risk) generate an `ApprovalTask` routed to a supervisor. The officer who drafts or owns a case cannot approve their own escalation; approval is a separate human decision. | `src/lib/ai/approval.ts`, `src/lib/types.ts` |
| **Append-only audit timeline** — an immutable, ordered record of every decision and action | Each pipeline stage and human action emits an `AuditEvent`. Events are append-only and presented as a chronological timeline at `/officer/audit`. Nothing is silently mutated or deleted. | `src/lib/audit.ts`, `src/lib/types.ts` |
| **Policy / document retrieval** — ground responses in an organisation's governing documents | Retrieval over synthetic council documents in `data/policies/` (service charter, drainage SOP, business-licensing FAQ, welfare/education aid policy, data-privacy policy, department routing rules). Section headings are the citation anchors. | `src/lib/rag/retrieve.ts` |
| **Model-draft + human-decision** — the model proposes, a person disposes | AI produces a `RoutingDecision`, a missing-info checklist, an approval recommendation, and a `CitizenReplyDraft`. AI never autonomously closes cases, approves escalations, dispatches field teams, or decides eligibility — officers and supervisors decide. | `src/lib/ai/pipeline.ts`, `src/lib/ai/approval.ts` |
| **Deterministic fallback adapter** — a swappable model interface with a deterministic offline mode | An LLM adapter exposes one interface with two backends: an optional Anthropic path (only if `ANTHROPIC_API_KEY` is set) and a deterministic fixture-based fallback that returns identical-shape structured output. The demo always runs offline via the fallback. | `src/lib/llm.ts`, `src/lib/ai/pipeline.ts` |
| **Synthetic demo data** — seeded, reproducible fixtures instead of real records | In-memory JSON store seeded from `data/seed`, re-seedable via `POST /api/reset`. Three core demo cases (Malay blocked drain, Chinese business-licence query, English education-aid pre-screen). No real citizen data, NRIC, addresses, or phone numbers. | `src/lib/types.ts`, `data/seed`, `data/policies/` |
| **pytest-style testing → Vitest** — deterministic, assertion-based tests over pipeline behaviour | The reference repo's Python/pytest testing discipline is re-expressed as **Vitest** suites in TypeScript: deterministic assertions over language detection, classification, retrieval citations, routing, approval rules, and reply drafting — all runnable offline. | `tests/*.test.ts` (classify, routing, approval, citation, audit) |
| **Multilingual / i18n surfacing** — present results in the user's language | Language detection and a small i18n layer surface UI strings and citizen replies in Malay (ms), English (en), Chinese (zh), and Tamil (ta), keeping official Malay/English terms where appropriate. | `src/lib/i18n.ts`, `src/lib/types.ts` |

### Concept-to-pipeline view

The same concepts, mapped onto the AI pipeline stages:

| Pipeline stage | Concept origin | Module |
| --- | --- | --- |
| Language detection | Model-draft + i18n surfacing | `src/lib/ai/pipeline.ts`, `src/lib/i18n.ts` |
| Classification | Model-draft + human-decision | `src/lib/ai/pipeline.ts` |
| Policy retrieval (RAG citations) | RAG-with-citations, policy retrieval | `src/lib/rag/retrieve.ts` |
| Routing decision | Role-aware workflow | `src/lib/ai/pipeline.ts` |
| Missing-info detection | Model-draft + human-decision | `src/lib/ai/pipeline.ts` |
| Approval rule | Approval gates (no self-approval) | `src/lib/ai/approval.ts` |
| Reply draft | Model-draft + i18n surfacing | `src/lib/ai/pipeline.ts`, `src/lib/i18n.ts` |
| Audit-event generation | Append-only audit timeline | `src/lib/audit.ts` |
| LLM-or-fallback selection | Deterministic fallback adapter | `src/lib/llm.ts` |

---

## 3. What Was Intentionally NOT Reused

The reference repository is a broad enterprise platform. The overwhelming majority of it is irrelevant to a citizen-service demo and was deliberately excluded. Nothing in the list below was copied, imported, or adapted:

- **Enterprise business domains** — HR, Sales, Finance, Accounts Payable (AP), and ERP modules and their data models. CivicFlow covers only PBT casework.
- **Model-gateway infrastructure** — the reference repo's multi-provider model gateway, routing, and orchestration plumbing. CivicFlow uses a single, minimal LLM adapter with a deterministic fallback.
- **Secrets and credentials** — API keys, tokens, service accounts, signing keys. None were read, referenced, or carried over.
- **Environment / configuration files** — `.env` files and environment-specific configuration from the reference repo were not imported. The demo needs no secrets to run.
- **Customer / production data** — any real customer, employee, or transactional data. CivicFlow ships only synthetic fixtures.
- **Enterprise infrastructure** — deployment manifests, cloud infra, message queues, databases, observability stacks, and CI/CD pipelines tied to the reference platform. CivicFlow runs as a single Next.js app with an in-memory store.

In short: only the **domain-neutral architectural patterns** crossed over. The implementation, the data, the domain, the language stack (TypeScript/Next.js vs. the reference repo's stack), and the test framework (Vitest vs. pytest) are all new and built specifically for this demo.

---

## 4. Hard-Rule Compliance Affirmation

For the avoidance of doubt, and consistent with the project's governance boundary:

- **No wholesale copy.** No source files were copied from the private reference repo. Only reusable concepts (listed in Section 2) were reimplemented from scratch in TypeScript.
- **No secrets.** No API keys, credentials, `.env` files, or configuration secrets were imported or are required. The demo runs fully offline with no `ANTHROPIC_API_KEY`.
- **All synthetic.** All cases, policy documents, citizen inputs, and seed data are 100% synthetic and public-demo safe. There is no real citizen data, no real government SOPs, no real NRIC, no real addresses, and no real phone numbers anywhere in this repository.
- **Human-in-the-loop preserved.** AI is limited to language detection, classification, summarisation, RAG retrieval, routing recommendation, missing-info detection, and reply drafting. AI does not autonomously close cases, approve high-risk escalations, dispatch field teams, or decide eligibility. High-risk decisions require human approval.

This is a hackathon **demo artifact**. It is not a production system and makes no claims of production readiness or measured performance.
