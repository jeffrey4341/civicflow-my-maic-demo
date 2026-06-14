# CivicFlow MY Mobile

`MAIC Nexus Challenge T5 — Public Services & Smart Cities` · `Public Demo Artifact` · `100% Synthetic Data` · `Runs Offline — No API Key Required`

> **This is a MAIC T5 (Public Services & Smart Cities) public hackathon demo.**
> It is a **public demo artifact**. All cases, SOPs, policies, and citizen data are **100% synthetic**.
> **AI drafts recommendations; officers and supervisors decide.** High-risk cases **require human approval**.
> CivicFlow is a **citizen-service workflow layer — not a chatbot.**

---

## Overview

**CivicFlow MY Mobile** is a mobile-first, multilingual citizen-service AI casework platform for Malaysian local councils (*Pihak Berkuasa Tempatan*, PBT). Citizens submit service requests in **Malay, English, Chinese, or Tamil**; the system detects the language, classifies the case, retrieves SOP / FAQ / service-charter citations via **RAG**, routes the case to the correct department, triggers **supervisor approval for high-risk cases**, drafts a multilingual citizen reply, and records a **full append-only audit timeline**. Throughout, AI is confined to drafting and recommendation — every consequential decision stays with a human officer or supervisor.

---

## What this is / What this is NOT

| This **is** | This is **NOT** |
| --- | --- |
| A citizen-service **workflow / casework layer** for local councils | A generic chatbot |
| A **role-aware** system: citizen mobile intake + officer console | A generic Enterprise Agent OS |
| **AI-assisted**: drafts classifications, routing, citations, and replies | An autonomous decision-maker |
| **Human-in-the-loop**: officers and supervisors make every decision | A system that auto-closes cases or auto-approves escalations |
| **Auditable**: append-only timeline for every case | A black box |
| A **public demo** on **100% synthetic** data | A production system or a store of real citizen data |

**Governance boundary.** AI is used for language detection, classification, summarisation, RAG retrieval, routing recommendation, missing-info detection, and reply drafting. AI does **not** autonomously close cases, approve high-risk escalations, dispatch field teams, or decide eligibility. **Human approval is required for all high-risk decisions.**

---

## Features — mapped to T5 themes

- **Citizen Agents** — A mobile-first intake agent that turns a free-text citizen request into a structured `CitizenCase`, detects missing information, and produces a draft citizen reply for officer review.
- **RAG (policy retrieval with citations)** — Every recommendation is grounded in synthetic council policy documents. Each `PolicyCitation` carries `source_doc`, `section`, `snippet`, and `confidence` so officers can trace exactly which SOP, FAQ, or charter section supports a decision.
- **E-Gov AI (workflow + approval gates)** — Department routing, status lifecycle, and a **supervisor approval gate** for high-risk cases. The full lifecycle is captured in an append-only `AuditEvent` timeline.
- **Multilingual LLMs** — Native handling of **Malay, English, Chinese, and Tamil**: language detection on intake and citizen replies drafted in the citizen's language (with official Malay/English terms preserved where relevant).
- **Civic Tech (transparency & safety)** — Synthetic-only data, a deterministic offline pipeline, explicit AI-disclosure and data/model cards, and a clearly drawn human-decision boundary suitable for public review.

---

## Tech stack

A single **Next.js 15 (App Router)** application — no separate backend service.

- **Next.js 15** (App Router) — UI + API route handlers under `/api`
- **React 18** + **TypeScript**
- **Tailwind CSS** — mobile-first styling
- **In-memory JSON store** — seeded from `data/seed`, re-seedable via `POST /api/reset`
- **Deterministic AI/RAG pipeline** — pure TypeScript, runs fully offline with fixtures
- **Optional Anthropic LLM path** — used **only** if `ANTHROPIC_API_KEY` is set; otherwise the deterministic fallback produces identical-shape structured output
- **Vitest** — unit / pipeline tests

The demo **always runs with no API key**. The optional LLM path is a drop-in enhancement, never a requirement.

---

## Quick Start

**Prerequisites:** Node.js **18+**.

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Then open **http://localhost:3000**:

- **`/m`** — citizen mobile experience (submit a request)
- **`/officer`** — staff console (triage, route, approve, audit)

For demo recording, use the production build/server path:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Then open **http://127.0.0.1:3000/m** and **http://127.0.0.1:3000/officer**.

If port `3000` is already occupied on the demo machine, keep the same command and change only the port, for example `--port 3004`, then open the matching `127.0.0.1` URL.

Run the test suite:

```bash
npm run typecheck
npm test
npm run lint
npm audit --omit=dev --audit-level=moderate
```

**Optional — Anthropic LLM path.** The demo runs end-to-end **without** any API key using the deterministic pipeline. If you wish to exercise the optional LLM path, set an `ANTHROPIC_API_KEY` in your environment before `npm run dev`. With no key present, the deterministic fallback returns structured output of identical shape, so the demo behaves consistently either way.

---

## Route map

| Route | Audience | Purpose |
| --- | --- | --- |
| `/m` | Citizen | Mobile-first intake: submit a multilingual service request, view the draft reply |
| `/officer` | Staff | Officer console home: case queue and triage |
| `/officer/cases/[id]` | Staff | Single-case view: classification, citations, routing, reply draft, timeline |
| `/officer/approvals` | Supervisor | Approval queue for high-risk cases (`awaiting_supervisor`) |
| `/officer/audit` | Staff | Append-only audit timeline across cases |
| `POST /api/reset` | System | Re-seed the in-memory store from `data/seed` |

---

## Demo walkthrough — three core cases

| # | Citizen input | Language | Category | Department | Citation | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | *"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."* | Malay (ms) | Drainage | Engineering / Drainage Unit | Drainage Response SOP | **Urgent / flood-risk** review → **supervisor approval REQUIRED**; citizen reply drafted in Malay |
| 2 | *"我要申请小食档执照，需要什么文件？"* | Chinese (zh) | Business licensing | Licensing Unit | Business Licensing FAQ | **Missing info** flagged (location, business type, operating hours); citizen reply in Chinese with official Malay/English terms |
| 3 | *"Can I apply for education aid for my child?"* | English (en) | Education aid / Welfare | Welfare / Education Support | Welfare Education Aid Policy | **No automatic approval** — officer review required; missing-document checklist returned |

Each case demonstrates a different governance path: high-risk escalation (case 1), clarification before routing (case 2), and human eligibility review (case 3).

---

## AI pipeline

For every submission, the pipeline runs these stages in order:

1. **Language detection** (ms / en / zh / ta)
2. **Classification** (category + urgency)
3. **Policy retrieval** — RAG citations from synthetic policy docs
4. **Routing decision** — recommend the responsible department
5. **Missing-info detection** — what the citizen still needs to supply
6. **Approval rule** — flag high-risk cases for supervisor approval
7. **Reply draft** — multilingual citizen reply in the detected language
8. **Audit-event generation** — append events to the case timeline

When no LLM key is present, a **deterministic fallback** produces output of identical shape at every stage.

---

## Data model

- **`CitizenCase`** — the core case record
- **`RoutingDecision`** — recommended department + rationale
- **`PolicyCitation`** — `source_doc`, `section`, `snippet`, `confidence`
- **`ApprovalTask`** — supervisor approval gate for high-risk cases
- **`AuditEvent`** — append-only timeline entry
- **`CitizenReplyDraft`** — multilingual draft reply for officer review

**`CitizenCase` status lifecycle:**

```
draft → needs_info → submitted → routed → awaiting_supervisor → in_progress → closed
```

### Synthetic policy documents (`data/policies/`)

Each document has section headings that RAG cites directly:

- `council_service_charter.md`
- `drainage_response_sop.md`
- `business_licensing_faq.md`
- `welfare_education_aid_policy.md`
- `citizen_data_privacy_policy.md`
- `department_routing_rules.md`

---

## Project structure

```
civicflow-my-maic-demo/
|-- src/
|   |-- app/
|   |   |-- m/                     # Citizen mobile route
|   |   |-- officer/               # Officer console
|   |   |   |-- cases/[id]/        # Single-case view
|   |   |   |-- approvals/         # Supervisor approval queue
|   |   |   `-- audit/             # Audit timeline
|   |   `-- api/                   # Next.js route handlers (incl. /api/reset)
|   |-- components/                # Citizen/officer UI components
|   `-- lib/                       # AI/RAG pipeline (deterministic + optional LLM)
|-- data/
|   |-- seed/                      # Seed cases for the in-memory store
|   `-- policies/                  # Synthetic policy documents (RAG corpus)
|-- tests/                         # Vitest pipeline + unit tests
|-- docs/                          # Additional documentation
|-- AI_DISCLOSURE.md
|-- DATA_CARD.md
|-- MODEL_CARD.md
`-- README.md
```

---

## Demo data & safety

- **100% synthetic.** No real citizen data, no real government SOPs, no real NRIC, no real addresses, no real phone numbers, no private agency data. Any identifiers shown are obvious placeholders.
- **Public-demo safe.** All policy documents under `data/policies/` are fictional drafts created for this demo; they do not represent any actual council's policies or procedures.
- **No secrets.** No environment files, credentials, or enterprise modules are included. The optional `ANTHROPIC_API_KEY` is supplied by you at runtime and is never committed.
- **Human-in-the-loop by design.** AI drafts; officers and supervisors decide. High-risk cases require explicit human approval before any escalation.
- **Not production-ready.** This is a hackathon demo artifact. It is not hardened, certified, or intended for live citizen-facing deployment.

This repository reuses only **architectural concepts** (not code) from a private reference project — role-aware workflow, RAG-with-citations, approval gates, append-only audit timeline, policy retrieval, model-draft + human-decision, deterministic fallback, synthetic demo data, and a test-first approach. No secrets, environment files, credentials, or enterprise modules were imported.

---

## Documentation

- [`AI_DISCLOSURE.md`](./AI_DISCLOSURE.md) — where and how AI is used, and the human-decision boundary
- [`DATA_CARD.md`](./DATA_CARD.md) — synthetic data sources, scope, and limitations
- [`MODEL_CARD.md`](./MODEL_CARD.md) — model behaviour, deterministic fallback, and intended use
- [`docs/`](./docs/) — additional design and walkthrough notes

---

*CivicFlow MY Mobile — a public demo for the MAIC Nexus Challenge T5 (Public Services & Smart Cities). Synthetic data only. AI assists; people decide.*
