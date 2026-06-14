# Model Card — CivicFlow MY Mobile AI Casework Pipeline

> **Demo artifact.** This model card describes the AI casework pipeline inside **CivicFlow MY Mobile**, a public hackathon demo built for the **MAIC Nexus Challenge T5 (Public Services & Smart Cities)**. It is **not a production system**, and it must **not** be used for real eligibility decisions or real citizen casework.

---

## 1. Overview

**CivicFlow MY Mobile** is a mobile-first, multilingual citizen-service AI casework platform for Malaysian local councils (*Pihak Berkuasa Tempatan*, PBT). Citizens submit service requests in Malay, English, Chinese, or Tamil. The pipeline detects the language, classifies the case, retrieves SOP/FAQ/service-charter citations via retrieval-augmented generation (RAG), recommends a routing department, flags high-risk cases for supervisor approval, drafts a multilingual citizen reply, and records a full append-only audit timeline.

This is a **citizen-service workflow / casework layer** — not a generic chatbot and not a generic "Enterprise Agent OS". The system **drafts** recommendations; **officers and supervisors decide**. High-risk cases **require** human approval.

The "model" described here is not a single trained model. It is a **deterministic TypeScript pipeline** (the default) with an **optional LLM path** (Anthropic Claude) that produces the same structured output schema when an API key is configured.

| Attribute | Detail |
|---|---|
| Pipeline name | CivicFlow MY Mobile AI casework pipeline |
| Version | Hackathon demo (T5) |
| Owner | CivicFlow MY Mobile demo team |
| Default engine | Deterministic TypeScript (heuristics + hybrid retrieval) — runs fully offline |
| Optional engine | Anthropic Claude (e.g. `claude-opus-4` family / `claude-sonnet`), used **only** if `ANTHROPIC_API_KEY` is set |
| Data | 100% synthetic — no real citizen data, SOPs, NRIC, addresses, or phone numbers |
| Languages | Malay (`ms`), English (`en`), Chinese (`zh`), Tamil (`ta`) |
| Status | Public-demo safe; **not for production** |

---

## 2. Intended Use

### 2.1 Intended use

- **Assistive triage and drafting** for Malaysian council citizen-service requests, in a **demonstration context only**.
- Helping officers by suggesting a **case category**, a **routing department**, relevant **policy citations**, a **missing-information checklist**, and a **draft multilingual reply**.
- Showcasing a governed, human-in-the-loop AI casework workflow for a civic-tech / e-government audience and hackathon judges.

### 2.2 Intended users

- Council officers and supervisors operating the officer console (`/officer`, `/officer/cases/[id]`, `/officer/approvals`, `/officer/audit`).
- Citizens submitting requests through the mobile route (`/m`) — who receive **drafted** replies that an officer reviews.

### 2.3 Out-of-scope / prohibited use

- **Real eligibility decisions** (e.g. welfare, education aid, licensing approvals) — explicitly out of scope.
- Autonomous case closure, autonomous approval of high-risk escalations, autonomous field-team dispatch.
- Processing of **real** personal data, real government SOPs, or any private agency data.
- Any production deployment or any use where a person could be materially affected by the output.

---

## 3. The Deterministic Engine (Default)

The deterministic engine is the **default and always-available** path. It runs **fully offline** using synthetic fixtures, with no network access and no API key. The demo always runs in this mode.

### 3.1 Classification

- **Keyword / heuristic classification.** Cases are categorised (e.g. *drainage*, *business licensing*, *education aid / welfare*) using curated keyword and pattern heuristics tuned to the demo's policy domains and the three core demo cases.
- **Language detection** uses script and keyword heuristics to choose among `ms`, `en`, `zh`, and `ta`.
- **Missing-information detection** applies per-category rules (e.g. licensing requires location, business type, and operating hours).
- **Approval rule** marks high-risk categories (e.g. flood-risk drainage) as requiring supervisor approval.

### 3.2 Retrieval (RAG citations)

- **Hybrid keyword + embedding-stub retrieval** over the synthetic policy corpus in `data/policies/`.
- A deterministic embedding **stub** provides stable, reproducible similarity scoring offline; it is **not** a trained semantic embedding model and should not be read as one.
- Retrieval returns one or more `PolicyCitation` objects, each with `source_doc`, `section`, `snippet`, and `confidence`.

**Synthetic policy corpus (`data/policies/`):**

- `council_service_charter.md`
- `drainage_response_sop.md`
- `business_licensing_faq.md`
- `welfare_education_aid_policy.md`
- `citizen_data_privacy_policy.md`
- `department_routing_rules.md`

Each document has section headings that the retriever cites by section.

### 3.3 Determinism guarantee

The deterministic engine produces **the same structured JSON schema** as the optional LLM path. When no API key is present, the deterministic fallback yields **identical-shape** structured output, so the workflow, audit timeline, and UI behave consistently regardless of engine.

---

## 4. The Optional LLM Path (Anthropic Claude)

The optional LLM path is used **only if an `ANTHROPIC_API_KEY` is present**. Otherwise the deterministic fallback is used. The demo is designed to run with **no API key**.

- **Provider / models:** Anthropic Claude — for example the `claude-opus-4` family or `claude-sonnet` (configurable via `CIVICFLOW_LLM_MODEL`). The optional LLM path calls the Anthropic Messages HTTP API directly via the runtime's built-in `fetch` — no third-party SDK is bundled or **required** to run the demo.
- **Role:** The LLM may assist with language detection, classification, summarisation, citation selection from retrieved candidates, routing recommendation, missing-info detection, and reply drafting.
- **Same contract:** The LLM path is constrained to emit the **same structured JSON schema** as the deterministic engine (the `RoutingDecision`, `PolicyCitation`, `CitizenReplyDraft`, etc. shapes). The downstream workflow does not branch on which engine produced the output.
- **No autonomy:** Whether the LLM or the deterministic engine is used, the AI **does not** close cases, approve high-risk escalations, dispatch field teams, or decide eligibility.

---

## 5. Inputs and Outputs

### 5.1 Inputs

- A free-text citizen service request (one of `ms` / `en` / `zh` / `ta`).
- Optional structured metadata captured in the mobile form.
- The synthetic policy corpus (`data/policies/`) used for retrieval.
- Synthetic seed data loaded into the in-memory store (re-seedable via `POST /api/reset`).

### 5.2 Pipeline stages

```
language detection
  -> classification
  -> policy retrieval (RAG citations)
  -> routing decision
  -> missing-info detection
  -> approval rule
  -> reply draft
  -> audit-event generation
```

The deterministic fallback runs the entire pipeline when no LLM key is configured.

### 5.3 Outputs (data models)

- **`CitizenCase`** — the case record. Status lifecycle: `draft -> needs_info -> submitted -> routed -> awaiting_supervisor -> in_progress -> closed`.
- **`RoutingDecision`** — recommended department and rationale.
- **`PolicyCitation`** — `source_doc`, `section`, `snippet`, `confidence`.
- **`ApprovalTask`** — supervisor approval task for high-risk cases.
- **`AuditEvent`** — append-only audit timeline entry.
- **`CitizenReplyDraft`** — drafted multilingual citizen reply (for officer review).

### 5.4 Worked demo cases (synthetic)

1. **Malay blocked-drain / flood risk** — input *"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."* → language Malay, category drainage, urgency urgent / flood-risk review, department Engineering / Drainage Unit, citation *Drainage Response SOP*, **supervisor approval required**, citizen reply in Malay.
2. **Chinese business-licence query** — input *"我要申请小食档执照，需要什么文件？"* → language Chinese, category business licensing, department Licensing Unit, citation *Business Licensing FAQ*, missing info (location, business type, operating hours), citizen reply in Chinese with official Malay/English terms.
3. **English education / welfare aid pre-screen** — input *"Can I apply for education aid for my child?"* → category education aid / welfare, department Welfare / Education Support, citation *Welfare Education Aid Policy*, **no automatic approval**, officer review required, missing-document checklist.

---

## 6. Performance and Caveats

- **No formal evaluation.** There are **no benchmark metrics, no accuracy figures, and no validated performance claims.** None should be inferred from this demo.
- **Heuristics tuned to demo cases.** The deterministic classification and retrieval heuristics are tuned to the synthetic policy corpus and the three core demo cases. They are not expected to generalise to real-world casework, real council SOPs, or out-of-distribution inputs.
- **Embedding stub, not a trained embedder.** The retrieval "embedding" is a deterministic stub for reproducible offline behaviour, not a semantic embedding model.
- **LLM variability.** If the optional Claude path is enabled, output quality and latency depend on the provider model and prompt; behaviour may differ from the deterministic default even though the output schema is identical.

---

## 7. Fairness and Multilingual Considerations

- The pipeline targets four languages — Malay (`ms`), English (`en`), Chinese (`zh`), Tamil (`ta`) — to reflect Malaysia's multilingual citizen base.
- **Risk of uneven quality across languages.** Heuristic coverage, keyword lists, and demo fixtures are not uniformly developed across all four languages, so detection, classification, retrieval, and reply quality may be **stronger for some languages than others**. Tamil and Chinese inputs in particular may receive less robust handling than the demo's primary scripted cases.
- **Mixed-language and code-switched** inputs (common in Malaysian usage) may be misclassified or mis-detected.
- Drafted replies should preserve official Malay/English terminology where appropriate (e.g. the licensing case), but term fidelity is **not guaranteed** and must be checked by an officer.
- Because all data is synthetic and there is no formal evaluation, **no fairness guarantees** are made. Disparate quality across languages, dialects, or phrasing styles is a known and unmeasured risk.

---

## 8. Limitations

- Synthetic-only knowledge: the system knows only the demo policy corpus; it cannot reason about real regulations, by-laws, or current council procedures.
- In-memory storage seeded from `data/seed`; state resets on re-seed (`POST /api/reset`) and is **not** durable.
- No identity verification, no real PII handling, no real case management integration.
- Citations are limited to the six synthetic policy documents and their section headings.
- Confidence scores are heuristic/stubbed and are **not** calibrated probabilities.
- The pipeline can produce incorrect classifications, citations, routing, or reply text — its outputs are **drafts for human review**, never authoritative determinations.

---

## 9. Human-in-the-Loop and Governance Boundary

Human oversight is a **required** part of the workflow, not an optional add-on.

**The AI is used for:** language detection, classification, summarisation, RAG retrieval, routing recommendation, missing-info detection, and reply drafting.

**The AI does NOT:** autonomously close cases, approve high-risk escalation, dispatch field teams, or decide eligibility.

- **AI drafts; officers and supervisors decide.**
- **High-risk cases require human approval.** Such cases enter the `awaiting_supervisor` state and surface an `ApprovalTask` that a supervisor must explicitly action.
- Every meaningful step is recorded as an append-only `AuditEvent`, giving a full audit timeline (`/officer/audit`).

---

## 10. Not for Production / Not for Real Eligibility Decisions

> **This pipeline is a hackathon demo artifact. It is NOT production-ready and must NOT be used for real eligibility decisions, real welfare or licensing determinations, or any real citizen casework.**
>
> All data is **100% synthetic**. There is no real citizen data, no real government SOPs, no real NRIC, no real addresses, and no real phone numbers (any identifiers shown are obvious placeholders). There is **no formal evaluation**, and **no production-readiness or accuracy claim** is made. Outputs are **AI-generated drafts requiring human review and decision**.

---

*CivicFlow MY Mobile — MAIC Nexus Challenge T5 (Public Services & Smart Cities) public hackathon demo. Public-demo safe; all data synthetic.*
