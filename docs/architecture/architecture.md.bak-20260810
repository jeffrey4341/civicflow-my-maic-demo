# CivicFlow MY Mobile — Technical Architecture

> **MAIC Nexus Challenge T5 (Public Services & Smart Cities) — Public Hackathon Demo**
>
> A mobile-first, multilingual citizen-service AI casework platform for Malaysian local councils (Pihak Berkuasa Tempatan / PBT).
>
> **Scope & safety:** This is a public demo artifact. **All data is 100% synthetic** — no real citizen data, no real government SOPs, no real NRIC, no real addresses, no real phone numbers. It is **not** a generic chatbot and **not** a generic Enterprise Agent OS; it is a citizen-service **workflow / casework layer**. **AI drafts; officers and supervisors decide.** High-risk cases **require** human approval.

---

## 1. Overview

Citizens submit a service request in Malay, English, Chinese, or Tamil from a mobile-first PWA. The platform:

1. detects the language,
2. classifies the case,
3. retrieves SOP / FAQ / service-charter citations (RAG),
4. routes to the correct council department,
5. triggers supervisor approval for high-risk cases,
6. drafts a multilingual citizen reply, and
7. records a full, append-only audit timeline.

The entire system is a **single Next.js 15 (App Router) + React 18 + TypeScript + Tailwind CSS** application. The backend is a set of Next.js route handlers under `/api`. The AI/RAG pipeline is **deterministic TypeScript** that runs fully offline against fixtures; an optional Anthropic LLM path is used **only** when an `ANTHROPIC_API_KEY` is present. The demo always runs with **no API key**.

---

## 2. High-level component diagram

```
                         CivicFlow MY Mobile  (single Next.js 15 app)
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                     │
 │   CLIENTS (React 18 + Tailwind, App Router pages)                                   │
 │                                                                                     │
 │   ┌───────────────────────────┐        ┌──────────────────────────────────────┐    │
 │   │  Citizen PWA   /m          │        │  Officer Console   /officer          │    │
 │   │  - submit request          │        │   /officer/cases/[id]                │    │
 │   │  - multilingual UI         │        │   /officer/approvals                 │    │
 │   │    (ms / en / zh / ta)     │        │   /officer/audit                     │    │
 │   │  - status + reply view     │        │  - review, approve/reject, timeline  │    │
 │   └─────────────┬─────────────┘        └────────────────────┬─────────────────┘    │
 │                 │                                            │                      │
 │                 │  fetch() JSON over HTTPS                   │                      │
 │                 ▼                                            ▼                      │
 │   ┌───────────────────────────────────────────────────────────────────────────┐   │
 │   │  Next.js ROUTE HANDLERS   /api/*                                           │   │
 │   │  POST /api/cases          (submit -> run pipeline)                         │   │
 │   │  GET  /api/cases /api/cases/[id]                                           │   │
 │   │  GET  /api/approvals      POST /api/approvals/[id]/decision               │   │
 │   │  GET  /api/audit                                                          │   │
 │   │  POST /api/reset          (re-seed in-memory store)                       │   │
 │   └───────────┬───────────────────────┬───────────────────────┬─────────────┘   │
 │               │                       │                       │                   │
 │               ▼                       ▼                       ▼                   │
 │   ┌────────────────────┐   ┌────────────────────────┐   ┌────────────────────┐    │
 │   │  IN-MEMORY STORE   │   │  DETERMINISTIC AI      │   │  RAG ENGINE        │    │
 │   │  (JSON objects)    │◄──┤  PIPELINE (8 stages)   │──►│  over data/policies│    │
 │   │  cases / routing / │   │  lang → class → RAG →  │   │  load md, split by │    │
 │   │  approvals / audit │   │  route → missing-info  │   │  headings, hybrid  │    │
 │   │  / replies         │   │  → approval → reply →  │   │  keyword+embed-stub │    │
 │   │  seeded data/seed  │   │  audit                 │   │  scoring, citations │    │
 │   └────────────────────┘   └───────────┬────────────┘   └────────────────────┘    │
 │                                        │                                           │
 │                                        ▼                                           │
 │                        ┌────────────────────────────────┐                         │
 │                        │  OPTIONAL LLM ADAPTER          │                         │
 │                        │  Anthropic HTTP API (fetch)    │                         │
 │                        │  used ONLY if ANTHROPIC_API_KEY │                        │
 │                        │  else deterministic fallback    │                        │
 │                        │  (identical-shape output)       │                        │
 │                        └────────────────────────────────┘                         │
 │                                                                                     │
 └───────────────────────────────────────────────────────────────────────────────────┘

   Synthetic policy corpus (data/policies/*.md) feeds the RAG engine.
   The demo runs entirely offline with no external API calls.
```

---

## 3. Request / data flow — case submission, end-to-end

A citizen submission travels from the PWA through `POST /api/cases`, which invokes the **8-stage deterministic pipeline**. Each stage produces a structured artifact persisted to the in-memory store, and every state transition appends exactly one audit event.

```
Citizen PWA (/m)
   │  POST /api/cases  { text, channel, contact (synthetic placeholder) }
   ▼
[Route handler]  create CitizenCase (status: draft → submitted)
   │
   ▼
┌──────────────────────── DETERMINISTIC AI PIPELINE ───────────────────────────┐
│                                                                              │
│ (1) Language detection      → case.language = ms | en | zh | ta              │
│ (2) Classification          → case.category, case.urgency                    │
│ (3) Policy retrieval (RAG)  → PolicyCitation[]  (source_doc, section,        │
│                               snippet, confidence)                           │
│ (4) Routing decision        → RoutingDecision (department, rationale,        │
│                               citation refs)                                 │
│ (5) Missing-info detection  → required vs supplied → needs_info? checklist   │
│ (6) Approval rule           → high-risk? → ApprovalTask + awaiting_supervisor │
│ (7) Reply draft             → CitizenReplyDraft (in detected language)       │
│ (8) Audit-event generation  → AuditEvent per state change (append-only)      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
Persist all artifacts to in-memory store
   │
   ├─ if missing info     → status = needs_info  (citizen prompted on /m)
   ├─ if high-risk        → status = awaiting_supervisor  (ApprovalTask queued)
   └─ else                → status = routed → in_progress
   │
   ▼
Officer Console (/officer)
   - reviews routing + citations + drafted reply
   - supervisor approves/rejects high-risk cases (/officer/approvals)
   - officer edits/sends citizen reply; case → in_progress → closed
   - full timeline visible at /officer/audit
```

**Worked example (core case 1 — Malay blocked drain / flood risk):**

| Stage | Output |
|---|---|
| Input | `"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."` |
| 1 Language | `ms` (Malay) |
| 2 Classification | category = `drainage`, urgency = `urgent` (flood-risk review) |
| 3 RAG citations | `drainage_response_sop.md` → relevant section, confidence high |
| 4 Routing | Engineering / Drainage Unit |
| 5 Missing-info | sufficient to route; no blocking gaps |
| 6 Approval | **high-risk (flood-risk drainage) → supervisor approval REQUIRED** |
| 7 Reply draft | drafted in Malay |
| 8 Audit | events for submit → route → escalate appended |

The other two core demo cases — a Chinese business-licence query routed to the Licensing Unit with a missing-info checklist (location, business type, operating hours), and an English education/welfare aid pre-screen routed to Welfare / Education Support with **no automatic approval** and an officer-review document checklist — exercise the same pipeline with different branch outcomes.

---

## 4. Data models

All models are plain TypeScript objects held in the in-memory store. Synthetic identifiers and placeholder contacts only.

### CitizenCase
| Field | Type | Notes |
|---|---|---|
| `id` | string | synthetic case id |
| `text` | string | citizen's original request |
| `language` | `ms \| en \| zh \| ta` | from stage 1 |
| `category` | string | e.g. `drainage`, `business_licensing`, `education_aid` |
| `urgency` | string | e.g. `normal`, `urgent` |
| `status` | enum | see §5 lifecycle |
| `pii_risk` | enum | `low \| medium \| high` — drives approval gate |
| `channel` | string | demo channel label |
| `contact` | string | **synthetic placeholder only** |
| `createdAt` / `updatedAt` | ISO timestamp | |

### RoutingDecision
`{ caseId, department, rationale, citationRefs[], confidence }` — links a case to one council department with a human-readable rationale and the citations that justify it.

### PolicyCitation
`{ source_doc, section, snippet, confidence }` — a single grounded reference into the synthetic policy corpus.

### ApprovalTask
`{ id, caseId, reason, riskFactors[], status: pending|approved|rejected, decidedBy?, decidedAt?, decisionNote? }` — created only for high-risk cases; resolved by a supervisor in `/officer/approvals`.

### AuditEvent
`{ id, caseId, type, fromStatus?, toStatus?, actor, summary, timestamp }` — **append-only**, one event per state change (see §7).

### CitizenReplyDraft
`{ caseId, language, body, citationsShown[], status: draft|sent }` — AI-drafted reply in the citizen's language; an officer reviews/edits before it is sent.

---

## 5. Status lifecycle (state machine)

```
                ┌─────────┐
                │  draft  │
                └────┬────┘
                     │  citizen submits
        missing info │
         ┌───────────┼──────────────┐
         ▼           ▼              
   ┌───────────┐  ┌───────────┐     
   │ needs_info│  │ submitted │     
   └─────┬─────┘  └─────┬─────┘     
         │  citizen     │  pipeline classifies + routes
         │  supplies    ▼
         │  info   ┌─────────┐
         └────────►│  routed │
                   └────┬────┘
                        │
            high-risk?  ├────────────── yes ─────────────┐
                        │                                ▼
                        │                     ┌────────────────────┐
                        │                     │ awaiting_supervisor │
                        │                     └──────────┬─────────┘
                        │             approve            │   reject → back to
                        │                                │   routed / needs_info
                        ▼                                ▼
                  ┌───────────┐  officer works    ┌───────────┐
                  │in_progress│◄──────────────────┤in_progress│
                  └─────┬─────┘                   └───────────┘
                        │  resolved
                        ▼
                   ┌─────────┐
                   │ closed  │
                   └─────────┘
```

**Canonical happy path:** `draft → needs_info → submitted → routed → awaiting_supervisor → in_progress → closed`. Not every case visits `needs_info` or `awaiting_supervisor`; those are conditional branches. **Only humans** move a case into `closed` or past an `awaiting_supervisor` gate — the AI never does so autonomously.

---

## 6. RAG approach

The RAG engine grounds routing and replies in the synthetic policy corpus under `data/policies/`:

- `council_service_charter.md`
- `drainage_response_sop.md`
- `business_licensing_faq.md`
- `welfare_education_aid_policy.md`
- `citizen_data_privacy_policy.md`
- `department_routing_rules.md`

**Pipeline:**

1. **Load** — read each markdown document.
2. **Split by headings** — chunk each document at its section headings, so every chunk carries `{ source_doc, section, text }`. Headings become citable section anchors.
3. **Hybrid scoring** — combine a **keyword/lexical score** (term overlap between the query and the chunk) with an **embedding-stub score** (a deterministic, offline vector-similarity stand-in). The two scores are blended into a single relevance score per chunk.
4. **Confidence** — the blended top score is normalised into a `confidence` value attached to each emitted citation.
5. **Citations** — the top-ranked chunks are returned as `PolicyCitation` objects (`source_doc`, `section`, `snippet`, `confidence`) and shown to officers and (where appropriate) summarised for citizens.

The **embedding stub** is deliberately deterministic so the demo produces identical, reproducible output offline. In a production system it would be replaced by real embeddings (see §10).

---

## 7. Approval gate logic

After routing, the **approval rule** stage decides whether a case can proceed automatically or must be held for human sign-off. A case is flagged **high-risk** (creating an `ApprovalTask` and moving the case to `awaiting_supervisor`) when **any** of the following hold:

- **Flood-risk drainage** — drainage cases with flood/water-rising signals (e.g. blocked drain + rapid water rise). These can have public-safety impact and require a supervisor decision before field action is implied.
- **High `pii_risk`** — the case content or required handling involves sensitive personal data (per the synthetic data-privacy policy), so a human reviews before processing.
- **Eligibility decisions** — welfare / education-aid and similar benefit determinations. The AI **pre-screens** and prepares a checklist, but it **does not decide eligibility**; an officer must review.

Everything else is routed for normal officer handling without a supervisor gate. The governance boundary is explicit: **AI does not autonomously close cases, approve high-risk escalation, dispatch field teams, or decide eligibility.**

---

## 8. Audit model

The audit trail is **append-only**: the system writes **exactly one `AuditEvent` per state change** and never mutates or deletes prior events. Each event captures `fromStatus → toStatus`, the `actor` (system pipeline stage, officer, or supervisor), a human-readable `summary`, and a `timestamp`. Together they form a complete, ordered timeline for every case, surfaced at `/officer/audit` and on the case detail page. Because events are immutable and one-per-transition, the timeline is the single source of truth for "what happened, when, and who acted" — supporting the role-aware, accountable casework model this demo illustrates.

---

## 9. Storage choice & re-seed

- **In-memory JSON store.** All entities (cases, routing decisions, citations, approvals, audit events, reply drafts) live in process memory as plain objects. This keeps the demo zero-dependency, fully offline, and instantly inspectable.
- **Seeded from `data/seed`.** On start, the store is hydrated with synthetic fixtures, including the three core demo cases.
- **Re-seedable via `POST /api/reset`.** Judges and presenters can reset the demo to a known-good state at any time, which is ideal for repeated live walkthroughs.

Because storage is in-memory, data does not persist across server restarts — an intentional choice for a demo, **not** a production design.

---

## 10. Deterministic-vs-LLM switch

The AI pipeline runs in one of two modes behind a single adapter boundary:

- **Deterministic mode (default, always used in the demo).** Pure TypeScript stages produce structured output from fixtures and rule logic. No network, no API key, fully reproducible.
- **Optional LLM mode.** If an `ANTHROPIC_API_KEY` is present, an adapter (`src/lib/llm.ts`) calls the Anthropic Messages HTTP API directly via the runtime's built-in `fetch` — no third-party SDK is bundled — to refine classification, language detection, and translation. Any error, timeout, or schema violation falls back to the deterministic engine.

**Critical contract:** both paths emit **identical-shape structured output**, so the rest of the system (store, UI, audit) is agnostic to which path ran. When no key is configured — the demo's normal state — the deterministic fallback is used and the output shape is unchanged. The LLM is never required to run or evaluate the demo.

---

## 11. Folder structure

```
civicflow-my-maic-demo/
├─ app/
│  ├─ m/                         # Citizen PWA (mobile-first, multilingual)
│  ├─ officer/
│  │  ├─ page.tsx                # /officer console home
│  │  ├─ cases/[id]/page.tsx     # case detail + timeline
│  │  ├─ approvals/page.tsx      # supervisor approval queue
│  │  └─ audit/page.tsx          # global audit timeline
│  └─ api/
│     ├─ cases/route.ts          # POST submit / GET list
│     ├─ cases/[id]/route.ts     # GET one
│     ├─ approvals/...           # GET queue / POST decision
│     ├─ audit/route.ts          # GET audit events
│     └─ reset/route.ts          # POST re-seed
├─ lib/
│  ├─ pipeline/                  # 8 deterministic stages
│  │  ├─ detectLanguage.ts
│  │  ├─ classify.ts
│  │  ├─ retrievePolicies.ts     # RAG
│  │  ├─ route.ts
│  │  ├─ missingInfo.ts
│  │  ├─ approvalRule.ts
│  │  ├─ draftReply.ts
│  │  └─ audit.ts
│  ├─ rag/                       # load + split + hybrid scoring + embed-stub
│  ├─ llm/                       # optional Anthropic adapter + fallback
│  └─ store/                     # in-memory store + seed loader
├─ data/
│  ├─ policies/                  # synthetic SOP / FAQ / charter markdown
│  └─ seed/                      # synthetic seed cases & fixtures
├─ docs/
│  └─ architecture/architecture.md
├─ tests/                        # vitest unit tests (pytest-style structure)
└─ package.json
```

(Exact filenames are illustrative of the architecture; the layout reflects the role-aware, pipeline-per-stage design.)

---

## 12. Scaling notes — what a production version would change

> **Out of scope for this demo.** The items below are explicitly **not** built here. This section exists to show judges we understand the gap between a hackathon artifact and a production e-government system. No production-readiness claims are made.

- **Real database.** Replace the in-memory store with a managed relational/document database (with backups, migrations, and tenancy per council/PBT). The append-only audit model would become a write-once event table or ledger.
- **Authentication & SSO.** Replace demo role switching with real identity for officers and supervisors — council SSO / national e-government identity, role-based access control, and session management. Citizen-facing identity would integrate appropriate verified-login options.
- **Real retrieval embeddings.** Replace the deterministic embedding stub with a genuine embedding model and a vector index, plus document-version management and re-indexing as SOPs change. Keyword + vector hybrid retrieval would be tuned and evaluated on real (governed) corpora.
- **Real council integrations.** Connect to actual PBT case-management, departmental work-order, GIS/asset, and notification systems (SMS/email/WhatsApp) instead of in-app drafts. Field dispatch would flow through authorised systems with humans in the loop.
- **Operational hardening.** Observability, rate limiting, data-residency and privacy compliance for **real** citizen data, accessibility audits, and formal language-quality review for ms / en / zh / ta would all be required.

Throughout, the **governance boundary stays fixed**: AI drafts recommendations, retrieves citations, and detects missing information; **officers and supervisors decide**, and high-risk actions always require human approval.

---

## 13. Dependencies

Runtime: `next`, `react`, `react-dom` (all MIT). Build/dev: `typescript` (Apache-2.0), `tailwindcss`, `postcss`, `autoprefixer`, `vitest` (MIT), and `@types/node` / `@types/react` / `@types/react-dom` (MIT). Optional LLM path: the Anthropic Messages HTTP API is called via built-in `fetch` — **no extra dependency** — only if an API key is configured, and is **not** required to run the demo. See `THIRD_PARTY_NOTICES` for the full list.

---

*CivicFlow MY Mobile is a public hackathon demo. All data is synthetic and public-demo-safe. This document describes a demonstration architecture, not a production deployment.*
