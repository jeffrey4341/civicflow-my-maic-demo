# CivicFlow MY Mobile — 3-Minute Demo Script

**MAIC Nexus Challenge T5 — Public Services & Smart Cities**

> **Important:** All data is 100% synthetic. No real citizen data, NRIC, addresses, phone numbers, or government SOPs. The demo runs fully offline with deterministic AI fallbacks — no API key required.

## Setup

From the project root:

```bash
npm install
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open:

- Citizen mobile app: `http://127.0.0.1:3000/m`
- Officer console: `http://127.0.0.1:3000/officer`
- Approvals: `http://127.0.0.1:3000/officer/approvals`
- Audit: `http://127.0.0.1:3000/officer/audit`

If port `3000` is occupied, use the same command with another local port, for example:

```bash
npm run start -- --hostname 127.0.0.1 --port 3004
```

Before each take, reset to a known demo state:

```bash
npm run seed:reset
```

or:

```bash
curl -X POST http://127.0.0.1:3000/api/reset
```

Use the matching port if not using `3000`.

---

## 0:00-0:15 — Opening

“CivicFlow MY Mobile is a multilingual citizen-service AI casework platform for Malaysian public agencies. It is not a government chatbot. It is a governed workflow system where AI drafts, humans decide and every case is auditable.”

Show the mobile citizen app and officer console side by side.

---

## 0:15-0:45 — Act 1: Malay blocked-drain complaint

“First, a citizen submits a public-service request in Malay.”

Type:

```text
Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.
```

Show the citizen mobile flow: language detected as Malay, issue classified as drainage, flood-risk urgency identified.

“The system detects Malay, classifies this as a drainage and flood-risk case, and prepares it for public-service routing.”

---

## 0:45-1:15 — SOP RAG + routing

Switch to officer console.

“On the officer side, CivicFlow retrieves the relevant Drainage Response SOP, recommends Engineering / Drainage Unit, shows the flood-risk rationale and creates an audit trail.”

Show citation panel.

“Every recommendation is grounded in synthetic SOP citations. If there is no reliable citation, the case falls back to manual review.”

---

## 1:15-1:45 — Approval gate

Show the blocked status buttons.

“Because this is a high-risk flood case, the officer cannot start or close the case directly. Supervisor approval is required before work can proceed.”

Go to approval panel. Enter a decision note. Approve.

“After the supervisor records a decision note, the case can move forward. The approval decision is recorded in the audit timeline.”

---

## 1:45-2:10 — Act 2: Chinese business licence query

Submit Chinese input:

```text
我要申请小食档执照，需要什么文件？
```

“Next, a citizen asks a business licence question in Chinese. CivicFlow detects Chinese, routes the case to the Licensing Unit, retrieves the Business Licensing FAQ and identifies missing information such as location, business type and operating hours.”

Show needs-info status and Chinese reply draft.

“The case cannot be treated as normal work until the missing information is resolved.”

---

## 2:10-2:35 — Act 3: English education / welfare aid

Submit:

```text
Can I apply for education aid for my child?
```

“Finally, a citizen asks about education aid. CivicFlow retrieves the welfare and education policy, prepares a document checklist and routes the case for officer review.”

Show wording that eligibility is not automatically approved.

“The AI does not approve eligibility. It helps officers review the case with evidence.”

---

## 2:35-2:55 — Audit and safety

Open `/officer/audit`.

“Every step is visible: case creation, language detection, classification, retrieval, routing, approval, reply draft and status changes. This is the public-sector control layer: multilingual intake, SOP-grounded AI, human approval and audit evidence.”

---

## 2:55-3:00 — Closing

“CivicFlow MY Mobile helps public agencies modernise citizen service while preserving accountability. AI drafts. Humans decide. Every case is traceable.”

---

## Current Verification Note

This script was aligned with the launch/deploy verification run on 2026-06-14 (MYT). The production build/server path was verified on `http://127.0.0.1:3004` because port `3000` was already occupied on the demo machine. See `docs/audit/launch_deploy_recheck_2026-06-14.md` for the current evidence.
