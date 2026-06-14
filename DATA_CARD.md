# Data Card — CivicFlow MY Mobile

**Product:** CivicFlow MY Mobile
**Context:** MAIC Nexus Challenge T5 (Public Services & Smart Cities) — public hackathon demo
**Status:** Demo artifact. Not a production system. Do not infer production readiness.
**Data classification:** 100% synthetic. Public-demo safe.

CivicFlow MY Mobile is a mobile-first, multilingual citizen-service AI casework platform for Malaysian local councils (Pihak Berkuasa Tempatan / PBT). Citizens submit service requests in Malay, English, Chinese, or Tamil; the system detects language, classifies the case, retrieves SOP/FAQ/service-charter citations, routes to the correct department, triggers supervisor approval for high-risk cases, drafts a multilingual citizen reply, and records a full audit timeline.

> **Important:** Every dataset described in this card is **invented for the demo**. Nothing here is, or is derived from, a real council document, a real citizen record, real personal data, or a real government SOP. **Do not load real citizen data into this demo.**

---

## 1. Scope of this card

This card describes all datasets shipped in the repository:

| Dataset | Location | Type | Purpose |
|---|---|---|---|
| Synthetic policy corpus | `data/policies/*.md` (6 files) | Synthetic text | Source documents for RAG citation retrieval |
| Seed citizen cases | `data/seed/cases.json` | Synthetic structured records | Pre-populate the in-memory store for the demo |

All other state (cases created during a demo session, routing decisions, approval tasks, audit events, reply drafts) is generated at runtime from these seeds and is held in an **in-memory JSON store**. Nothing is persisted to disk beyond the synthetic files above. The store is re-seedable via `POST /api/reset`.

---

## 2. Synthetic policy corpus (`data/policies/`)

### 2.1 Purpose

The policy corpus is the knowledge base that the deterministic RAG layer searches to produce `PolicyCitation` objects. Each document is plain markdown with named **section headings**; the retriever cites a document section, returns a short snippet, and attaches a confidence score. These documents are what the officer console shows as the evidence behind every AI recommendation.

### 2.2 Provenance and disclaimer

These six documents are **entirely invented for this demo**. They are **not** real PBT service charters, not real council SOPs, not real licensing FAQs, and not real welfare policies. They were written to be plausible-looking and structurally realistic for a civic-tech audience, **without** copying, paraphrasing, or reproducing any actual government document. They have **no legal force** and must not be treated as authoritative guidance for any real council, applicant, or member of the public.

### 2.3 Documents

| File | Role in the demo | Example cited sections |
|---|---|---|
| `council_service_charter.md` | Service-level commitments, response-time framing | Response Time Commitments, Channels of Service |
| `drainage_response_sop.md` | Drainage / flood-risk handling and escalation | Flood-Risk Triage, Escalation to Supervisor |
| `business_licensing_faq.md` | Hawker / small-stall licence questions and required documents | Required Documents, Application Steps |
| `welfare_education_aid_policy.md` | Education / welfare aid pre-screening and document checklist | Eligibility Pre-Screen, Required Supporting Documents |
| `citizen_data_privacy_policy.md` | The synthetic privacy / PII-handling policy referenced by this card | Data Minimisation, Masking & Redaction |
| `department_routing_rules.md` | Category-to-department routing logic cited by routing decisions | Category Mapping, Department Ownership |

### 2.4 How the corpus is used

- Retrieval is **deterministic TypeScript** that runs fully offline against these fixtures.
- An optional Anthropic LLM path is used **only** if `ANTHROPIC_API_KEY` is present; otherwise the deterministic fallback produces identical-shape structured output. The demo always runs with **no API key**.
- A `PolicyCitation` has: `source_doc`, `section`, `snippet`, `confidence`.

---

## 3. Seed citizen cases (`data/seed/cases.json`)

### 3.1 Purpose

`cases.json` seeds the in-memory store so the officer console and citizen mobile view have realistic-looking content on first load, and so the three core demo journeys can be replayed deterministically.

### 3.2 Provenance and disclaimer

Every seed case is **fictional and invented**. All names, locations, identifiers, and contact details are **fabricated placeholders**:

- **Names** are invented and do not refer to any real person.
- **Locations** are obviously fictional — e.g. `Jalan Demo`, and demo-only `SS`-style labels such as a generic `Jalan SS2` used purely to illustrate a drainage scenario. These are **not** real addresses.
- **National identifiers (NRIC)** are **never** real. Where a record needs an NRIC-shaped field, it carries a **masked placeholder** only, e.g. `XXXXXX-XX-XXXX`.
- **Phone numbers** are **not** real numbers. Placeholders only (e.g. `+60-XX-XXX-XXXX`).
- **Addresses** are **not** real addresses. Placeholders / fictional labels only.

> No record in `cases.json` contains a real NRIC, a real phone number, or a real address. Do not replace these placeholders with real personal data.

### 3.3 Core demo cases represented

The seed set illustrates the three reference journeys (and supporting variants):

1. **Malay blocked-drain / flood risk** — input *"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."* → language Malay, category drainage, urgency urgent / flood-risk review, department Engineering / Drainage Unit, citation *Drainage Response SOP*, **supervisor approval required**, citizen reply in Malay.
2. **Chinese business-licence query** — input *"我要申请小食档执照，需要什么文件？"* → language Chinese, category business licensing, department Licensing Unit, citation *Business Licensing FAQ*, missing-info detection (location, business type, operating hours), citizen reply in Chinese with official Malay/English terms.
3. **English education / welfare aid pre-screen** — input *"Can I apply for education aid for my child?"* → category education aid / welfare, department Welfare / Education Support, citation *Welfare Education Aid Policy*, **no automatic approval**, officer review required, missing-document checklist.

---

## 4. Data model and fields

The runtime data models are: `CitizenCase`, `RoutingDecision`, `PolicyCitation`, `ApprovalTask`, `AuditEvent`, and `CitizenReplyDraft`.

### 4.1 `CitizenCase` (selected fields)

| Field | Description | PII / privacy handling |
|---|---|---|
| `id` | Synthetic case identifier | Non-PII |
| `language` | Detected language (`ms` / `en` / `zh` / `ta`) | Non-PII |
| `category` | Classified case category | Non-PII |
| `status` | Lifecycle state (see below) | Non-PII |
| `raw_text` | Citizen's submitted request text | May contain free-text PII in real use → demo data is synthetic only |
| `citizen_name` | Display name | **Synthetic placeholder only** |
| `citizen_contact` | Contact handle | **Masked / placeholder only** (e.g. `+60-XX-XXX-XXXX`) |
| `nric_masked` | National identifier field | **Masked placeholder only**, e.g. `XXXXXX-XX-XXXX` — never a real NRIC |
| `location` | Reported location | **Fictional label only**, e.g. `Jalan Demo` |
| `pii_risk` | PII-risk indicator on the record | Drives masking / redaction behaviour in the UI |

**Status lifecycle:** `draft → needs_info → submitted → routed → awaiting_supervisor → in_progress → closed`.

### 4.2 PII-risk handling (`pii_risk`)

- Each case carries a **`pii_risk`** field that flags records likely to contain personal data.
- When `pii_risk` is set, identifier-bearing fields are presented in **masked form** (NRIC shown as `XXXXXX-XX-XXXX`, contact and address shown as placeholders).
- The masking convention and the data-minimisation stance are described in the synthetic `citizen_data_privacy_policy.md`, which is also part of the RAG corpus so officers can see the privacy rationale cited inline.
- In this demo, **all data is synthetic**, so masking operates over placeholder values. The mechanism is demonstrated, not exercised against real PII.

---

## 5. Synthetic data guarantees (checklist)

- [x] All policy documents are **invented for the demo** — not real council, government, or agency documents.
- [x] All citizen cases are **fictional** — invented names, fictional locations (e.g. `Jalan Demo`), demo-only `SS`-style labels.
- [x] **No real NRIC** anywhere — only masked placeholders such as `XXXXXX-XX-XXXX`.
- [x] **No real phone numbers** — placeholders only (e.g. `+60-XX-XXX-XXXX`).
- [x] **No real addresses** — fictional labels / placeholders only.
- [x] **No private agency data**, no real SOPs, no real service charters.
- [x] **No secrets, credentials, API keys, or `.env` files** in the data.
- [x] Data is held in an **in-memory store**, re-seedable via `POST /api/reset`; nothing real is persisted.
- [x] AI/RAG runs **deterministically and offline** against fixtures by default; no data leaves the machine when no API key is set.
- [x] Reusing only **architectural concepts** from a private reference repo — no imported records, secrets, or enterprise modules.

---

## 6. Intended use / out-of-scope use

### 6.1 Intended use

- Demonstrating a **citizen-service workflow / casework layer** for Malaysian local councils in a hackathon / civic-tech setting.
- Showing the AI pipeline end to end: language detection → classification → policy retrieval (RAG citations) → routing decision → missing-info detection → approval rule → reply draft → audit-event generation.
- Illustrating **governance boundaries**: AI **drafts** recommendations; officers and supervisors **decide**; high-risk cases **require human approval**.
- Education, evaluation by judges, and design review.

### 6.2 Out-of-scope use

- **Not** for use with real citizen data. Do not load, paste, or import real personal data, real NRIC, real contact details, real addresses, or real case records into this demo.
- **Not** a source of legal, licensing, welfare, or drainage guidance — the policy corpus is invented and has no authority.
- **Not** a production casework system and **not** a system of record. No production readiness is claimed.
- **Not** a generic chatbot and **not** a generic Enterprise Agent OS.
- The AI does **not** autonomously close cases, approve high-risk escalation, dispatch field teams, or decide eligibility. Those remain human decisions.

---

## 7. Reset and reproducibility

- The in-memory store is seeded from `data/seed/` at startup and can be restored at any time with `POST /api/reset`.
- Because retrieval and the AI fallback are deterministic, the three core demo journeys reproduce identically across runs with no API key configured.

---

*This is a public hackathon demo artifact. All datasets are synthetic. Do not load real citizen data into this demo.*
