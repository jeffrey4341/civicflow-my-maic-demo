# CivicFlow MY Mobile — Live Demo Script

**MAIC Nexus Challenge T5 — Public Services & Smart Cities**
A mobile-first, multilingual citizen-service AI casework platform for Malaysian local councils (Pihak Berkuasa Tempatan / PBT).

> **Demo length:** ~5–7 minutes. Three acts, one persona each.
> **Important:** All data is 100% synthetic. No real citizen data, NRIC, addresses, phone numbers, or government SOPs. The demo runs fully offline with deterministic AI fallbacks — **no API key required**.

---

## What you are showing

CivicFlow MY Mobile is **not** a generic chatbot and **not** a generic Enterprise Agent OS. It is a **citizen-service workflow / casework layer** for PBTs.

A citizen submits a service request in Malay, English, Chinese, or Tamil. The system:

1. **Detects** the language
2. **Classifies** the case (category + urgency)
3. **Retrieves** SOP / FAQ / service-charter **citations** (RAG)
4. **Routes** to the correct department
5. **Triggers supervisor approval** for high-risk cases
6. **Drafts** a multilingual citizen reply
7. **Records** a full append-only audit timeline

> **Governance boundary to repeat out loud:** AI **drafts** recommendations; officers and supervisors **decide**. High-risk cases **require human approval**. AI never autonomously closes cases, approves escalation, dispatches field teams, or decides eligibility.

---

## Setup (run before judges arrive)

From the project root:

```bash
npm install
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open the app at **http://127.0.0.1:3000**.

If port `3000` is already occupied on the demo machine, keep the same command and change only the port, for example `--port 3004`, then open the matching `127.0.0.1` URL.

Use `npm run dev` only for development edits. For the recorded demo, use the production build/server path above so the run matches the public submission artifact.

Optional — guarantee a clean, known state before you present:

```bash
npm run seed:reset
```

> `seed:reset` re-seeds the in-memory JSON store from `data/seed`. It is equivalent to calling `POST /api/reset`. Run it once before your first take so the case list, approvals, and audit log start empty/known.

**Two windows / tabs you will switch between:**

- **Citizen mobile** — `/m` (mobile-first; resize the browser narrow or use device emulation)
- **Officer console** — `/officer`, with case detail at `/officer/cases/[id]`, the approval queue at `/officer/approvals`, and the global audit log at `/officer/audit`

---

## Opening line (15 seconds)

> "This is CivicFlow MY Mobile — a casework layer that lets a Malaysian council handle citizen requests in four languages. The AI drafts; the officer decides. Watch how one Malay drain complaint, one Chinese licence query, and one English aid request each get a different, governed outcome — with citations and a full audit trail. Everything here is synthetic."

---

## Act 1 — Malay blocked drain / flood risk (the approval gate)

**Persona:** *Encik Rahman*, a resident reporting a blocked drain that floods quickly when it rains. This is the **high-risk** path that **requires** supervisor approval.

### 1. Citizen submits (open `/m`)

Paste this exact text into the citizen request box:

```
Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.
```

Submit.

### 2. Expected visible outcome on `/m`

| Field | Expected |
|---|---|
| **Language detected** | Malay (ms) |
| **Category** | Drainage |
| **Urgency** | Urgent — flood-risk review |
| **Department** | Engineering / Drainage Unit |
| **Citation** | Drainage Response SOP (`drainage_response_sop.md`) — section heading + snippet + confidence |
| **Status** | `awaiting_supervisor` (the request is held for human approval, not auto-actioned) |
| **Citizen reply draft** | In **Malay**, acknowledging the report and stating it is under review |

> Say: "Because this is flood-risk, the system did **not** act on it — it raised a supervisor approval task. No drain team gets dispatched by the AI."

### 3. Show the approval gate (open `/officer/approvals`)

- Point to the new **ApprovalTask** for the drainage case sitting in the queue.
- Open it: the officer sees the AI's routing recommendation, the urgency, and the **Drainage Response SOP** citation backing the decision.
- **Approve** (or note that Approve / Reject are both available — the human owns the decision).

### 4. Show the audit timeline (open `/officer/cases/[id]`)

Open the case detail and scroll to the **audit timeline**. Walk the append-only `AuditEvent` chain:

```
language detected → classified → policy retrieved (citation) →
routing decision → approval rule fired → awaiting_supervisor →
supervisor approved → in_progress
```

> Emphasise: "Every stage is logged with its citation. This is the evidence trail an Auditor-General or a council ratepayer could inspect."

---

## Act 2 — Chinese food-stall licence (missing info + Chinese reply)

**Persona:** *Ms Tan*, a would-be hawker asking what documents she needs to license a small food stall. This is the **clarification** path — the AI detects missing information and asks for it instead of guessing.

### 1. Citizen submits (open `/m`)

Paste this exact text:

```
我要申请小食档执照，需要什么文件？
```

Submit.

### 2. Expected visible outcome on `/m`

| Field | Expected |
|---|---|
| **Language detected** | Chinese (zh) |
| **Category** | Business licensing |
| **Department** | Licensing Unit |
| **Citation** | Business Licensing FAQ (`business_licensing_faq.md`) |
| **Status** | `needs_info` (missing-info detected — not yet routed for action) |
| **Missing-info clarification** | Asks for **location**, **business type**, and **operating hours** |
| **Citizen reply draft** | In **Chinese**, listing the documents needed, with official **Malay / English** terms retained for accuracy (e.g. *Lesen Penjaja* / business licence) |

> Say: "The AI didn't fabricate a checklist for the wrong stall type. It identified the three things it still needs and asked — in Chinese — while keeping the official Malay and English licensing terms so nothing is lost in translation."

### 3. Show on the officer side (open `/officer/cases/[id]`)

- Status reads `needs_info`.
- The **missing-info** fields (location, business type, operating hours) are listed as outstanding.
- The **Business Licensing FAQ** citation is attached to the routing recommendation.
- Audit timeline shows: `language detected → classified → policy retrieved → missing-info detected → needs_info`.

---

## Act 3 — English education aid (officer review, no auto-approval)

**Persona:** *Mr Kumar*, a parent asking whether he can apply for education aid for his child. This is the **human-eligibility** path — the AI pre-screens and assembles a document checklist, but **does not decide eligibility** and **does not auto-approve**.

### 1. Citizen submits (open `/m`)

Paste this exact text:

```
Can I apply for education aid for my child?
```

Submit.

### 2. Expected visible outcome on `/m`

| Field | Expected |
|---|---|
| **Language detected** | English (en) |
| **Category** | Education aid / welfare |
| **Department** | Welfare / Education Support |
| **Citation** | Welfare Education Aid Policy (`welfare_education_aid_policy.md`) |
| **Approval** | **No automatic approval** — officer review required |
| **Status** | Routed for officer review (eligibility decided by a human) |
| **Document checklist** | Missing-document checklist shown (e.g. proof of household income, child's enrolment confirmation, guardianship — synthetic placeholders only) |
| **Citizen reply draft** | In **English**, explaining that eligibility is assessed by an officer and listing the documents to prepare |

> Say: "The AI will never tell a citizen they qualify for welfare. It cites the Welfare Education Aid Policy, builds the document checklist, and routes the case to a human who decides eligibility."

### 3. Show on the officer side (open `/officer/cases/[id]`)

- Case is flagged **officer-review-required**; there is **no auto-approval** and no eligibility verdict from the AI.
- The **missing-document checklist** is shown as actionable items.
- The **Welfare Education Aid Policy** citation backs the routing.
- Audit timeline shows the same governed stage sequence, ending in officer review rather than an AI decision.

---

## What to emphasise (the four judging points)

- **Multilingual by design** — one platform handles Malay, English, Chinese, and Tamil. Language is detected automatically and the citizen is answered **in their own language**, with official Malay/English terms preserved for accuracy.
- **Grounded in citations (RAG)** — every classification and routing decision is backed by a **PolicyCitation** (source doc, section, snippet, confidence) drawn from the council's synthetic SOPs, FAQs, and service charter. No ungrounded answers.
- **Human-in-the-loop governance** — AI **drafts**; officers and supervisors **decide**. High-risk drainage **requires** supervisor approval (Act 1); welfare eligibility is **never** auto-decided (Act 3). The AI does not close cases, approve escalation, dispatch teams, or decide eligibility.
- **Audit evidence** — every case carries an append-only audit timeline of `AuditEvent`s, each tied to its citation and decision. This is inspectable, accountable e-government — not a black box.

> One closing sentence: "Same pipeline, three governed outcomes — an approval gate, a clarification, and a human-eligibility review — all multilingual, all cited, all auditable."

---

## Reset between runs

Before each fresh take, return the demo to a clean known state so the case list, approval queue, and audit log start empty:

```bash
npm run seed:reset
```

or call the endpoint directly:

```bash
curl -X POST http://127.0.0.1:3000/api/reset
```

This re-seeds the in-memory store from `data/seed`. Because storage is in-memory, a full server restart (`Ctrl+C`, then `npm run dev`) also resets all state. Run the reset between every rehearsal and before the live judging run.

---

*CivicFlow MY Mobile is a public hackathon demo artifact. All data, policies, names, and identifiers are synthetic and for demonstration only. This is not a production system and makes no production-readiness or performance claims.*
