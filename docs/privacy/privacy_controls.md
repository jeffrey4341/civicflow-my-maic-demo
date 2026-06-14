# Privacy & Data-Protection Controls

**CivicFlow MY Mobile** — MAIC Nexus Challenge T5 (Public Services & Smart Cities) — Public Hackathon Demo

> **Scope & disclaimer.** This document describes the privacy and data-protection controls implemented in the **CivicFlow MY Mobile** demo. It is written in the *spirit* of Malaysia's **Personal Data Protection Act 2010 (PDPA)** to demonstrate privacy-by-design thinking appropriate for a citizen-service platform serving local councils (Pihak Berkuasa Tempatan / PBT). It is a **demo artifact and is not legal advice**, not a compliance certification, and not a production system. All data handled by the demo is **100% synthetic**.

---

## 1. Purpose

CivicFlow MY Mobile is a mobile-first, multilingual citizen-service AI casework platform. Citizens submit service requests in Malay, English, Chinese, or Tamil; the system detects language, classifies the case, retrieves SOP/FAQ/service-charter citations (RAG), routes to the correct department, triggers supervisor approval for high-risk cases, drafts a multilingual citizen reply, and records a full audit timeline.

Because casework inherently touches personal data (names, contact details, addresses, the nature of a complaint), the design treats privacy as a first-class concern. This document explains **what controls exist, how each is implemented in the demo, and where to find them in the codebase**.

This is **not** a generic chatbot and **not** a generic Enterprise Agent OS. It is a citizen-service workflow/casework layer in which **AI drafts** recommendations and **officers and supervisors decide**. High-risk cases **require human approval**.

---

## 2. Privacy principles applied (PDPA spirit)

The demo is shaped around the data-protection principles that underpin Malaysia's PDPA. The table below maps each principle to how the demo expresses it.

| PDPA-aligned principle | How the demo expresses it |
| --- | --- |
| **General / lawful processing** | Data is processed only to progress a citizen service request raised by the citizen themselves. |
| **Notice & choice** | The synthetic `citizen_data_privacy_policy.md` document states what is collected and why; it is retrievable as a policy citation. |
| **Disclosure / purpose limitation** | Data is used solely for citizen-service casework — routing, drafting replies, and audit. No secondary use, profiling, or marketing. |
| **Security** | Demo runs locally and offline by default; no external data egress unless an optional API key is explicitly configured by the operator. |
| **Retention** | All data is **ephemeral and in-memory**, re-seedable via `POST /api/reset`. Nothing is persisted beyond the running process. |
| **Data integrity** | Cases carry a structured, append-only audit trail so the record of what happened is accurate and traceable. |
| **Access** | The officer console exposes case data only within the casework UI; the citizen mobile route exposes only the citizen's own request flow. |

---

## 3. Data minimisation

The demo collects only what is necessary to triage and route a service request:

- **Free-text request** in the citizen's language (the substance of the case).
- **Minimal contact context** required to follow up (synthetic only — see masking below).
- **Derived fields** produced by the pipeline (language, category, urgency, routing, citations, missing-info, reply draft) rather than additional personal data harvested from the citizen.

The AI pipeline is designed to **classify and route**, not to enrich. It does not attempt to look up, infer, or append external personal data about the citizen. Missing-info detection asks the citizen for the **minimum** additional facts needed to progress the case (e.g. location, business type, operating hours for a licence query) and nothing more.

---

## 4. The `pii_risk` field — flagging high-PII cases

Every `CitizenCase` is evaluated for personal-data sensitivity. The pipeline annotates cases with a **`pii_risk`** signal so that officers can see, at a glance, when a case is likely to contain higher-sensitivity personal data (for example, an identity number, a precise home address, or details about a child in a welfare/education-aid context).

- **What it does:** raises a visible indicator on cases that appear to contain elevated personal data, prompting extra care in handling, drafting, and disclosure.
- **How it is derived:** deterministic TypeScript heuristics scan the request text for patterns associated with identity numbers, contact numbers, and address-like content. When the optional LLM path is enabled, it produces the **same-shape** structured output; the demo always runs with the deterministic fallback by default.
- **Why it matters:** a high `pii_risk` case is a cue for tighter human oversight and is one of the inputs that can steer a case toward supervisor review.

`pii_risk` is a **demo heuristic**, not a guaranteed PII detector. It exists to demonstrate privacy-aware UX and to reinforce that synthetic data should be handled as if it were real.

---

## 5. NRIC / phone masking in synthetic seed data

The seed data under `data/seed` is entirely synthetic, and personally identifying tokens are **masked even though they are fake**, to model good handling practice and to prevent any seed value from ever *looking* like a real record.

- **NRIC:** rendered with masked placeholders such as `XXXXXX-XX-XXXX` rather than any realistic 12-digit identity number. No real or real-format NRIC is stored.
- **Phone numbers:** rendered as obvious placeholders such as `+60-XX-XXX-XXXX`. No dialable or real-looking number is stored.
- **Addresses:** generalised to area-level placeholders (e.g. "Jalan SS2 area") rather than precise unit/house addresses.
- **Names:** clearly fictional synthetic names.

Masking is applied **at the seed level** so that even the demo's starting state contains no value that could be mistaken for real personal data. Because the store is re-seedable, the masked baseline is always recoverable via `POST /api/reset`.

---

## 6. Purpose limitation — citizen-service casework only

Data in the demo is used **only** to progress a citizen service request through its lifecycle:

```
draft -> needs_info -> submitted -> routed -> awaiting_supervisor -> in_progress -> closed
```

The AI is used **only** for: language detection, classification, summarisation, RAG retrieval, routing recommendation, missing-info detection, and reply drafting. The AI **does not**:

- autonomously close cases,
- approve high-risk escalation,
- dispatch field teams,
- decide eligibility (e.g. for welfare/education aid), or
- use case data for profiling, analytics, marketing, or any secondary purpose.

There is no cross-citizen linkage, no behavioural profiling, and no export of personal data to third parties. The optional Anthropic LLM path is invoked **only** if an `ANTHROPIC_API_KEY` is present; the demo as shipped runs fully offline with deterministic fixtures and sends no data anywhere.

---

## 7. Human oversight for high-risk cases

Privacy and safety converge at the **approval gate**. High-risk cases — for example the Malay blocked-drain / flood-risk case, or any case with elevated sensitivity — are routed to **`awaiting_supervisor`** and **require human approval** before they proceed.

- AI produces a **draft** recommendation (routing, reply, missing-info checklist).
- An **officer** reviews the case; a **supervisor** approves or rejects high-risk escalations via `/officer/approvals`.
- Eligibility decisions (e.g. education/welfare aid) are **never** automated — the officer reviews against the policy checklist.

This human-in-the-loop boundary ensures that decisions affecting a citizen, and any disclosure of their personal data, remain under human control.

---

## 8. Audit transparency

Every material action on a case generates an **`AuditEvent`**, producing an **append-only** timeline viewable at `/officer/audit` and per case at `/officer/cases/[id]`. The audit trail records the sequence of pipeline stages, routing, approvals, and reply drafting.

This supports the data-protection goals of **accountability** and **traceability**: a reviewer can reconstruct exactly what the system recommended, what a human decided, and when — which is essential when personal data is involved. The audit log is designed to capture **decisions and events**, not to duplicate raw personal data unnecessarily.

---

## 9. Retention — ephemeral, in-memory, re-seedable

The demo has **no durable datastore**. Storage is an **in-memory JSON store** seeded from `data/seed`.

- Data lives only for the lifetime of the running Next.js process.
- Restarting the server clears all working data.
- `POST /api/reset` re-seeds the store back to the synthetic masked baseline.

In effect, the demo's retention period is "the current session." This deliberately models a **minimal-retention** posture and ensures no personal-data-shaped record accumulates over time. A production deployment would replace this with a governed datastore and an explicit retention/disposal schedule — out of scope for this demo.

---

## 10. The synthetic privacy policy (`citizen_data_privacy_policy.md`)

The demo ships a **synthetic** policy document, `data/policies/citizen_data_privacy_policy.md`, alongside the other synthetic policy documents (council service charter, drainage response SOP, business licensing FAQ, welfare/education-aid policy, department routing rules).

- It states, in demo form, **what data is collected, why, how long it is kept, and the citizen's rights** in the spirit of the PDPA.
- It has section headings that are **citable by RAG**: when relevant, the pipeline can attach a `PolicyCitation` (`source_doc`, `section`, `snippet`, `confidence`) pointing back to this policy, so citizens and officers can see the privacy basis for handling.
- It is **fictional content for demonstration only** and does not represent any real council's privacy notice.

---

## 11. Controls checklist

| Control | How implemented in the demo | Where |
| --- | --- | --- |
| **Data minimisation** | Collect only request text + minimal contact context; pipeline classifies/routes, does not enrich | AI pipeline (deterministic TS); `data/seed` |
| **High-PII flagging** | `pii_risk` signal on `CitizenCase` via deterministic heuristics (LLM-optional, same shape) | `CitizenCase` model; classification stage |
| **NRIC masking** | Masked placeholders (`XXXXXX-XX-XXXX`); no real-format identity numbers | `data/seed` |
| **Phone masking** | Obvious placeholders (`+60-XX-XXX-XXXX`); no dialable numbers | `data/seed` |
| **Address generalisation** | Area-level placeholders only (e.g. "Jalan SS2 area") | `data/seed` |
| **Purpose limitation** | Data used only for casework lifecycle; no profiling/secondary use | AI pipeline; route handlers under `/api` |
| **Human oversight (high-risk)** | High-risk → `awaiting_supervisor`; supervisor approval required; eligibility never automated | Approval rule stage; `/officer/approvals` |
| **Audit transparency** | Append-only `AuditEvent` timeline per case and system-wide | `AuditEvent` model; `/officer/audit`, `/officer/cases/[id]` |
| **Minimal retention** | In-memory store; ephemeral; re-seedable | In-memory JSON store; `POST /api/reset` |
| **Offline-by-default** | Deterministic fixtures; LLM path only if `ANTHROPIC_API_KEY` set | Deterministic fallback; AI pipeline |
| **Privacy notice** | Synthetic citizen privacy policy, citable via RAG | `data/policies/citizen_data_privacy_policy.md` |
| **Notice via citations** | `PolicyCitation` links handling back to the privacy policy | Policy retrieval (RAG) stage |

---

## 12. Important: all data is synthetic

> **All data in CivicFlow MY Mobile is 100% synthetic and exists solely for this public hackathon demo.** There are no real citizen records, no real government SOPs, no real NRIC, no real phone numbers, no real addresses, and no private agency data.
>
> **No real personal data should ever be entered into this demo.** Do not paste, type, or upload any real person's identity number, contact details, address, or any other real personal information into any field. The demo is intended only for demonstration with the provided synthetic fixtures and obvious placeholder values.

This document describes privacy-by-design intent for a demo and does not constitute legal advice or a representation of PDPA compliance for any production deployment.
