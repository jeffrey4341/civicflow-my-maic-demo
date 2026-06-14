# AGENTS.md — CivicFlow MY Mobile

> **Project:** CivicFlow MY Mobile — a MAIC Nexus Challenge **T5 (Public Services & Smart Cities)** public hackathon demo.
> **Scope of this document:** (1) how the AI "agents" / automated reasoning steps work as a bounded, cooperating pipeline, and (2) contributor guidance for anyone — human or AI — extending this repository.

CivicFlow MY Mobile is a mobile-first, multilingual citizen-service casework platform for Malaysian local councils (*Pihak Berkuasa Tempatan* / PBT). Citizens submit service requests in **Malay, English, Chinese, or Tamil**. The system detects language, classifies the case, retrieves SOP/FAQ/service-charter citations via RAG, recommends a routing department, triggers supervisor approval for high-risk cases, drafts a multilingual citizen reply, and records a full audit timeline.

**Positioning.** This is **not** a generic chatbot and **not** a generic "Enterprise Agent OS". It is a citizen-service **workflow / casework layer**. The AI **drafts** recommendations; officers and supervisors **decide**. High-risk cases **require** human approval.

**Data.** 100% **synthetic**. No real citizen data, no real government SOPs, no real NRIC, no real addresses, no real phone numbers, no private agency data. Public-demo safe.

---

## 1. Design philosophy: bounded, cooperating components

The "agents" here are **not** autonomous, open-ended actors. Each is a small, **bounded** reasoning step with:

- a **single, narrow purpose**,
- a **typed input** and a **typed, structured output** (identical shape whether produced by the LLM path or the deterministic fallback),
- an explicit **human checkpoint** where a decision (not a draft) is required, and
- a **deterministic fallback** so the demo runs **fully offline with fixtures** and never depends on an external model.

The pipeline runs end-to-end as: *language detection → classification → policy retrieval (RAG citations) → routing decision → missing-info detection → approval rule → reply draft → audit-event generation.*

**LLM vs. deterministic.** The AI/RAG logic is **deterministic TypeScript**. An optional Anthropic LLM path is used **only if `ANTHROPIC_API_KEY` is present**; otherwise the deterministic fallback produces **identical-shape** structured output. **The demo always runs with no API key.**

---

## 2. Pipeline diagram

```
 Citizen input (ms | en | zh | ta) via /m
        │
        ▼
 ┌──────────────────────┐
 │ 1. Language Detector │ ── fallback: script/keyword heuristics
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 2. Case Classifier   │ ── fallback: keyword → category map
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 3. Policy Retriever   │ ── RAG over data/policies/*  → PolicyCitation[]
 │    (RAG / citations)  │     every recommendation cites OR → manual review
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 4. Routing Recommender│ ── fallback: department_routing_rules.md
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 5. Missing-Info       │ ── fallback: per-category required-field checklist
 │    Detector           │
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐        high-risk?
 │ 6. Approval-Gate      │ ──────────────────►  ★ SUPERVISOR APPROVAL ★
 │    Evaluator          │                      (status: awaiting_supervisor)
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 7. Reply Drafter      │ ── DRAFT only → officer reviews before send
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ 8. Audit Recorder     │ ── append-only AuditEvent for every state change
 └──────────┬───────────┘
            ▼
 Officer console (/officer …) — humans DECIDE
```

`★` = mandatory human checkpoint for high-risk cases. Officers also review the drafted reply before anything is sent.

---

## 3. Stage reference

Each stage below lists **purpose**, **inputs**, **outputs**, the **human checkpoint** (if any), and the **deterministic-fallback behaviour**.

### Stage 1 — Language Detector

- **Purpose:** Identify the citizen's language so downstream stages and the reply are in the right language.
- **Inputs:** Raw citizen message text (free text from `/m`).
- **Outputs:** Detected language code — `ms`, `en`, `zh`, or `ta` — with a confidence value; written onto the `CitizenCase`.
- **Human checkpoint:** None directly, but the officer can override the detected language in `/officer/cases/[id]`.
- **Deterministic fallback:** Unicode script detection (CJK block → `zh`, Tamil block → `ta`) plus Malay/English keyword and stop-word heuristics. On a tie or low confidence, defaults to `en` and flags the case for officer confirmation.

### Stage 2 — Case Classifier

- **Purpose:** Assign a service category (e.g. drainage, business licensing, education/welfare aid) so the case can be routed and matched to the right policy.
- **Inputs:** Citizen message text + detected language.
- **Outputs:** `category`, optional sub-category, and an `urgency` signal; written onto the `CitizenCase`.
- **Human checkpoint:** Officer can re-classify in the case detail view; re-classification re-runs downstream stages.
- **Deterministic fallback:** Keyword-to-category mapping per language (e.g. *longkang / drainage / flood* → drainage; *执照 / lesen / licence* → business licensing; *education aid / bantuan pendidikan* → welfare/education aid). Unmatched input → category `general_enquiry`, urgency `normal`.

### Stage 3 — Policy Retriever / RAG

- **Purpose:** Ground every recommendation in a cited source from the synthetic policy corpus.
- **Inputs:** Category, language, and key terms from the message.
- **Outputs:** `PolicyCitation[]`, each with `source_doc`, `section`, `snippet`, and `confidence`. Corpus lives in `data/policies/`: `council_service_charter.md`, `drainage_response_sop.md`, `business_licensing_faq.md`, `welfare_education_aid_policy.md`, `citizen_data_privacy_policy.md`, `department_routing_rules.md`.
- **Human checkpoint:** Officer sees citations alongside every recommendation and can reject or add citations.
- **Deterministic fallback:** Section-heading + keyword matching over the policy markdown (no embeddings required). **If no citation clears the confidence threshold, the stage returns zero citations and forces the case into manual review** — recommendations are never emitted uncited (see Guardrails §4).

### Stage 4 — Routing Recommender

- **Purpose:** Recommend the responsible department/unit for the case.
- **Inputs:** Category, citations, urgency.
- **Outputs:** A `RoutingDecision` (recommended department + supporting citation + confidence). Examples: drainage → *Engineering / Drainage Unit*; business licensing → *Licensing Unit*; education/welfare aid → *Welfare / Education Support*.
- **Human checkpoint:** **The routing is a recommendation only.** The officer confirms or overrides routing; AI never dispatches a field team.
- **Deterministic fallback:** Lookup against `department_routing_rules.md`. No matching rule → routed to a *General Enquiries* triage queue for manual assignment.

### Stage 5 — Missing-Info Detector

- **Purpose:** Identify required-but-absent information so the citizen can be asked once, up front.
- **Inputs:** Category, message text, and the per-category required-field checklist.
- **Outputs:** A list of missing fields/documents; can set case status to `needs_info`.
- **Human checkpoint:** Officer reviews the checklist before it is surfaced to the citizen.
- **Deterministic fallback:** Static per-category required-field checklists (e.g. business licensing → location, business type, operating hours; education aid → child's details, household info, supporting-document checklist). Fields not clearly present in the message are reported as missing.

### Stage 6 — Approval-Gate Evaluator

- **Purpose:** Decide whether a case may proceed automatically or must wait for supervisor approval.
- **Inputs:** Category, urgency, routing, and risk flags (e.g. flood/safety risk, eligibility decisions, anything in the high-risk set).
- **Outputs:** Either *no gate required* or an `ApprovalTask` plus case status `awaiting_supervisor`.
- **Human checkpoint:** **Mandatory.** High-risk cases require **supervisor approval** in `/officer/approvals` before they advance. AI never approves escalation itself.
- **Deterministic fallback:** Rule table mapping (category × urgency × risk flag) → gate required / not required. **Default-deny on ambiguity:** if risk cannot be determined, the case is gated for supervisor review rather than allowed through.

### Stage 7 — Reply Drafter

- **Purpose:** Draft a clear, multilingual citizen reply summarising next steps, what is needed, and which department is handling the case.
- **Inputs:** Detected language, category, routing, missing-info list, citations.
- **Outputs:** A `CitizenReplyDraft` in the citizen's language (Chinese replies retain official Malay/English terms where appropriate). **Marked as a draft.**
- **Human checkpoint:** **Mandatory.** The draft is never auto-sent; an officer reviews and edits before it goes to the citizen.
- **Deterministic fallback:** Language-specific reply templates populated with the structured fields above. Stable, reviewable, no free-form generation required.

### Stage 8 — Audit Recorder

- **Purpose:** Maintain an append-only, end-to-end timeline of the case.
- **Inputs:** Every stage output and every officer/supervisor action.
- **Outputs:** `AuditEvent` records (actor, action, timestamp, before/after status, related citations/decisions), viewable in `/officer/audit`.
- **Human checkpoint:** None — it records, it does not decide.
- **Deterministic fallback:** Always-on. Audit recording is **not** model-dependent: every state change appends an `AuditEvent` regardless of whether the LLM or deterministic path was used.

---

## 4. Guardrails

These are hard rules. Contributors must not weaken them.

1. **Citation or manual review.** Every recommendation must carry **at least one `PolicyCitation`** *or* the case is forced into **manual review**. No uncited recommendation is ever surfaced as actionable.
2. **AI drafts, humans decide.** The AI **never** autonomously:
   - **closes** a case,
   - **approves** high-risk escalation,
   - **dispatches** field teams, or
   - **decides eligibility** (e.g. welfare/education aid is *pre-screened*, never auto-approved).
3. **High-risk → supervisor approval.** Any case flagged high-risk (e.g. flood/public-safety risk, eligibility-bearing decisions) is gated to `awaiting_supervisor` and cannot advance without a human supervisor's approval.
4. **Default-deny on ambiguity.** When risk or confidence is unclear, the safe path is taken: gate for review and/or fall back to manual handling — never the permissive path.
5. **Deterministic parity.** The deterministic fallback must produce **identical-shape** structured output to the LLM path so behaviour and tests are stable with **no API key**.
6. **Append-only audit.** Every state change logs an `AuditEvent`. Audit history is never mutated or deleted in place.

### Worked examples (three core demo cases)

| Case | Input (synthetic) | Lang | Category | Department | Citation | Gate / human checkpoint |
|------|-------------------|------|----------|------------|----------|--------------------------|
| 1 | "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat." | ms | drainage (urgent / flood-risk) | Engineering / Drainage Unit | Drainage Response SOP | **Supervisor approval REQUIRED**; reply in Malay |
| 2 | "我要申请小食档执照，需要什么文件？" | zh | business licensing | Licensing Unit | Business Licensing FAQ | Missing info (location, business type, operating hours); reply in Chinese with official Malay/English terms |
| 3 | "Can I apply for education aid for my child?" | en | education aid / welfare | Welfare / Education Support | Welfare Education Aid Policy | **No automatic approval** — officer review + missing-document checklist |

---

## 5. Governance boundary (summary)

**AI is used for:** language detection, classification, summarisation, RAG retrieval, routing **recommendation**, missing-info detection, and reply **drafting**.

**AI is NOT used to:** autonomously close cases, approve high-risk escalation, dispatch field teams, or decide eligibility. **Human approval is required for high-risk decisions.**

Case status lifecycle (humans drive the decisive transitions):

```
draft → needs_info → submitted → routed → awaiting_supervisor → in_progress → closed
```

---

## 6. Contributor guidance (human or AI extending this repo)

This file is also the **agent-contributor contract**. If you add or modify a stage, follow these rules:

1. **Keep data synthetic.** No real citizen data, NRIC, addresses, phone numbers, real council SOPs, or private agency data. Use obvious placeholders (e.g. `Jalan SS2`, `+60-XXXXXXXX`, `NRIC: 000000-00-0000`). Seed data lives under `data/seed` and is re-seedable via `POST /api/reset`.
2. **Keep humans in the loop.** Any new stage must (a) emit a **draft/recommendation**, not an autonomous action, and (b) preserve the guardrails in §4. Decisive transitions (close, approve, dispatch, eligibility) stay with officers/supervisors.
3. **Log an `AuditEvent` for every state change.** No silent mutations. The audit timeline must remain a complete, append-only record.
4. **Maintain deterministic parity.** Every stage must work **offline with fixtures**. If you add an LLM-assisted path, add the matching deterministic fallback that returns the **same structured shape**, and ensure the demo runs with **no `ANTHROPIC_API_KEY`**.
5. **Cite or fall back.** Recommendations must carry a `PolicyCitation` or route to manual review. If you add a new policy document to `data/policies/`, give it clear section headings so RAG can cite specific sections.
6. **Type the boundaries.** Reuse the shared data models — `CitizenCase`, `RoutingDecision`, `PolicyCitation`, `ApprovalTask`, `AuditEvent`, `CitizenReplyDraft` — rather than introducing parallel shapes.

### Tech context

- **Stack:** a single **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS** application. Backend = Next.js route handlers under `/api`. Storage = in-memory JSON store seeded from `data/seed`.
- **Routes:** citizen mobile `/m`; officer console `/officer`, `/officer/cases/[id]`, `/officer/approvals`, `/officer/audit`.
- **Reset:** `POST /api/reset` re-seeds the in-memory store.
- **Tests:** Vitest, pytest-style structure — exercise the deterministic path so suites pass with no API key.

### Provenance note

This repository reuses only **architectural concepts** (not code) from a private reference repo: role-aware workflow, RAG-with-citations, approval gates, append-only audit timeline, policy retrieval, model-draft + human-decision, deterministic fallback, synthetic demo data, and pytest-style testing. **No secrets, environment files, credentials, or enterprise modules were imported.**

---

*This is a hackathon demo artifact. It uses 100% synthetic data and makes no claim of production readiness.*
