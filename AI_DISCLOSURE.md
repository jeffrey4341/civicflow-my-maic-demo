# AI Disclosure — CivicFlow MY Mobile

**Project:** CivicFlow MY Mobile
**Context:** MAIC Nexus Challenge T5 (Public Services & Smart Cities) — public hackathon demo
**Status:** Demonstration artifact only. Not production software. Not a procurement-ready system.

CivicFlow MY Mobile is a mobile-first, multilingual citizen-service AI casework platform for Malaysian local councils (Pihak Berkuasa Tempatan / PBT). Citizens submit service requests in Malay, English, Chinese, or Tamil. The system detects the language, classifies the case, retrieves SOP/FAQ/service-charter citations (RAG), routes the case to the correct department, triggers supervisor approval for high-risk cases, drafts a multilingual citizen reply, and records a full append-only audit timeline.

This document discloses, in plain terms, **where artificial intelligence is used, what it is never permitted to do, and how humans stay in control.** It is published openly so that civic-tech reviewers, e-government stakeholders, and hackathon judges can assess the governance posture of the demo.

**Positioning.** CivicFlow MY Mobile is **not a generic chatbot** and **not a generic "Enterprise Agent OS"**. It is a citizen-service **workflow / casework layer**. AI **drafts** recommendations; officers and supervisors **decide**. High-risk cases **require** human approval.

> **All data in this demo is 100% synthetic.** There is no real citizen data, no real government SOPs, no real NRIC, no real addresses, and no real phone numbers. See [Data & privacy](#data--privacy).

---

## Where AI is used

AI assists across the casework pipeline. Every AI output is **advisory** — it informs a human decision or produces a draft for human review. The table below maps each pipeline stage to the AI role and the human control that governs it.

| Stage | AI role | Human control |
| --- | --- | --- |
| Language detection | Detects whether the request is Malay, English, Chinese, or Tamil | Officer can override the detected language; reply language is officer-confirmed |
| Classification | Suggests a case category (e.g. drainage, business licensing, education/welfare aid) | Officer confirms or re-classifies before the case progresses |
| Summarisation | Produces a short officer-facing summary of the citizen request | Officer reads the original submission; summary is a convenience, not the record |
| Policy retrieval (RAG) | Retrieves relevant SOP/FAQ/service-charter sections as `PolicyCitation`s (source_doc, section, snippet, confidence) | Citations are shown with their source so the officer verifies against the actual policy document |
| Routing recommendation | Recommends the responsible department/unit (`RoutingDecision`) | Officer accepts or redirects routing; AI cannot finalise routing alone |
| Missing-info detection | Flags missing fields or documents (e.g. location, business type, operating hours, required documents) | Officer decides what to request from the citizen; AI only proposes the checklist |
| Reply drafting | Drafts a multilingual citizen reply (`CitizenReplyDraft`) in the detected language | **Every machine-drafted reply must be reviewed and approved by a human before it is sent** |
| Approval rule | Flags high-risk cases as requiring supervisor approval (`ApprovalTask`) | A supervisor must explicitly approve; AI raises the flag but never grants approval |
| Audit-event generation | Records structured `AuditEvent` entries for each pipeline step | Append-only timeline; humans review the trail but events are not editable after the fact |

In summary, AI is used for **language detection, classification, summarisation, RAG retrieval, routing recommendation, missing-info detection, and reply drafting.**

---

## What AI never does

The following actions are **out of scope for the AI by design**. They are reserved exclusively for human officers and supervisors:

- **AI does NOT autonomously close cases.** Case closure is a human action.
- **AI does NOT approve high-risk escalations.** Supervisor approval is mandatory for high-risk cases.
- **AI does NOT dispatch field teams.** No operational dispatch is triggered by the model.
- **AI does NOT decide eligibility.** Eligibility for any service or aid (e.g. education/welfare aid) is determined by a human officer, not the model.

**Human approval is required for all high-risk decisions.** The AI may *recommend*, *flag*, *draft*, and *summarise* — but the binding decision always rests with a person.

---

## Determinism & fallback

CivicFlow MY Mobile is built to run **fully offline and deterministically** so that the demo is reproducible for judges and reviewers.

- The AI/RAG pipeline is implemented as **deterministic TypeScript** that runs without any external model call. Given the same input, it produces the same structured output.
- An **optional Anthropic LLM path** is used **only if an `ANTHROPIC_API_KEY` is present** in the environment.
- **When no API key is configured** (the default for this demo), the system uses **deterministic fixtures** and heuristics that produce **identical-shape structured output** to the LLM path.
- **The demo always runs with no API key.** Reviewers do not need any credentials, network access, or paid services to reproduce the full pipeline.

This means the eight pipeline stages — language detection → classification → policy retrieval (RAG citations) → routing decision → missing-info detection → approval rule → reply draft → audit-event generation — all execute end-to-end in deterministic mode.

---

## Languages supported

The demo supports four languages, reflecting the multilingual reality of Malaysian local-council service delivery:

| Language | Code |
| --- | --- |
| Malay (Bahasa Malaysia) | `ms` |
| English | `en` |
| Chinese | `zh` |
| Tamil | `ta` |

Citizen replies are drafted in the detected language. For specialist or official terms (e.g. licensing terminology), drafts may retain official Malay/English terms alongside the citizen's language for clarity.

---

## Limitations & known risks

This is a hackathon demonstration. Its limitations are disclosed openly:

- **Machine-drafted replies must be reviewed.** Every `CitizenReplyDraft` is a draft. It may contain errors, omissions, or inappropriate tone, and **must be reviewed and approved by a human officer before it is sent to a citizen.**
- **Classification is keyword/heuristic in deterministic mode.** Without an LLM key, language detection, classification, and routing rely on keyword matching and rule-based heuristics over synthetic fixtures. These can misclassify edge cases, mixed-language input, code-switching, or unusual phrasings.
- **RAG citations are scoped to synthetic policy documents.** Retrieval only covers the bundled synthetic policy set; it does not reflect any real council's current SOPs or service charter.
- **No production hardening.** The demo uses an in-memory JSON store seeded from fixtures (re-seedable via `POST /api/reset`). There is no authentication, persistence guarantee, rate limiting, or security hardening suitable for production.
- **No performance or accuracy claims.** This document deliberately makes no quantitative accuracy, latency, or reliability claims. None should be inferred.
- **Translation quality is not guaranteed.** Multilingual drafting is best-effort and requires human review, especially for legally or financially significant communications.

---

## Human oversight model

Human oversight is structural, not optional. The casework lifecycle is gated so that consequential steps always pass through a person.

**Roles**

- **Officer** — reviews the AI-classified case, confirms language and category, verifies citations against source policy, requests missing information, and reviews/edits the drafted citizen reply.
- **Supervisor** — provides mandatory approval for high-risk cases via the approvals queue before they can proceed.

**Lifecycle gates** (`CitizenCase` status):

```
draft → needs_info → submitted → manual_review → routed → awaiting_supervisor → in_progress → closed
```

- The transition into `awaiting_supervisor` exists specifically to enforce **human approval** for high-risk cases — the AI raises the `ApprovalTask`, but only a supervisor can clear it.
- The transition to `closed` is a **human action**; the AI cannot close cases.
- Every step writes an append-only `AuditEvent`, producing a reviewable, tamper-evident timeline. Officer console routes (`/officer`, `/officer/cases/[id]`, `/officer/approvals`, `/officer/audit`) make this oversight visible and actionable.

**Worked examples** (synthetic):

- *Blocked drain / flood risk (Malay):* classified as drainage, flagged urgent with flood-risk review, routed to the Engineering / Drainage Unit, cited against the Drainage Response SOP — **supervisor approval required** before action.
- *Business-licence query (Chinese):* classified as business licensing, routed to the Licensing Unit, cited against the Business Licensing FAQ — missing-info flagged (location, business type, operating hours); officer reviews the drafted reply.
- *Education/welfare aid pre-screen (English):* classified as education aid / welfare, routed to Welfare / Education Support, cited against the Welfare Education Aid Policy — **no automatic approval and no eligibility decision**; officer review with a missing-document checklist.

---

## Data & privacy

- **100% synthetic data.** No real citizen data, no real government SOPs, no real NRIC, no real addresses, no real phone numbers, and no private agency data are used.
- Any names, identifiers, or locations are obvious placeholders.
- The bundled synthetic policy documents (`data/policies/`) are illustrative and do not represent any actual council's policies.
- This repository is **public-demo safe**: it contains no secrets, no environment files, no credentials, and no proprietary modules.

---

## Third-party software

All third-party packages used by this project, together with their licences, are listed in **[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)**. The optional Anthropic LLM path calls the Messages HTTP API directly via the built-in `fetch` (no third-party SDK), is used **only** when an API key is configured, and is **not required** to run the demo.

---

## Contact / accountability (demo placeholder)

This is a hackathon demonstration submission and does not represent a live service. The contacts below are **placeholders** for the purposes of the demo and should not be treated as a real support channel.

- **Project:** CivicFlow MY Mobile — MAIC Nexus Challenge T5 demo
- **Accountable party:** Demo team (placeholder)
- **Contact:** demo@example.com (placeholder — not monitored)
- **Scope of accountability:** Demonstration artifact only; no real citizen cases are handled and no operational decisions are made by this software.

For real public-service deployments, accountability for AI-assisted decisions would rest with the responsible local council (PBT) and its designated officers, with the human oversight model described above remaining mandatory.
