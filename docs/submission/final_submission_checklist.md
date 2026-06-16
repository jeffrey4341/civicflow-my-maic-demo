# CivicFlow MY Mobile — Final Submission Checklist (MAIC T5)

> **Status:** Candidate-readiness checklist (Day 2, docs-only)
> **Date:** 2026-06-16
> **Track:** MAIC Nexus Challenge **T5 — Public Services & Smart Cities**
> **Artifact type:** Public hackathon demo. **100% synthetic data.** Runs fully offline, no API key required.
> **Scope of this document:** Documentation only. This checklist does **not** modify product code, the RAG pipeline, approval logic, audit logic, tests, dependencies, or UI behavior. It records what must be true for the artifact to be submission-ready and points to the source-of-truth files for each claim.

This file is the single pre-submission gate. Each box is something a reviewer or release engineer can independently confirm against the repository. Where a claim is asserted, the backing file is cited so nothing here has to be taken on faith.

---

## 1. T5 Track Alignment

CivicFlow MY Mobile is a mobile-first, multilingual **citizen-service AI casework platform** for Malaysian local councils (PBT). A citizen submits a free-text request in their own language; the system detects the language, classifies the case, retrieves grounding policy citations via RAG, recommends a department route, gates high-risk cases behind mandatory human approval, drafts a citizen reply in the detected language, and records every step on an append-only audit timeline.

This maps directly to **T5 — Public Services & Smart Cities**: it is an e-government service-delivery tool that improves citizen access and council triage speed while keeping a human accountable for every consequential decision.

- [ ] Track label is stated exactly as **"MAIC Nexus Challenge T5 — Public Services & Smart Cities"** — see [README.md:3](README.md) and [architecture.md:3](docs/architecture/architecture.md)
- [ ] Project name is stated exactly as **"CivicFlow MY Mobile"** — see [README.md:1](README.md)
- [ ] Public-demo framing ("public hackathon demo, 100% synthetic data, runs offline") is consistent across [README.md](README.md), [AGENTS.md](AGENTS.md), and [AI_DISCLOSURE.md](AI_DISCLOSURE.md)
- [ ] Problem statement and PBT (local-council) context are described in [README.md](README.md) and [architecture.md](docs/architecture/architecture.md)
- [ ] Human-in-the-loop positioning ("AI drafts, humans decide") is reflected as a hard guardrail, not a slogan — see [AGENTS.md:152](AGENTS.md)

---

## 2. T5 Theme Mapping

Each MAIC T5 sub-theme maps to a concrete, auditable capability already implemented in the repository. The mapping below is the spine of the pitch and the demo.

### 2.1 Citizen Agents
A mobile-first intake agent turns an unstructured citizen request into a structured `CitizenCase`, detects missing information, and produces a draft reply — all before a human officer touches it.

- [ ] Mobile intake wizard at `/m`: language selection → free-text request → clarifying questions — see [src/app/m/page.tsx](src/app/m/page.tsx)
- [ ] 8-stage triage pipeline orchestrated end-to-end — see [src/lib/ai/pipeline.ts](src/lib/ai/pipeline.ts)
- [ ] Missing-information detection forces `needs_info` instead of guessing — see [src/lib/ai/pipeline.ts](src/lib/ai/pipeline.ts)

### 2.2 RAG (Retrieval-Augmented Generation)
Every recommendation is grounded in one or more `PolicyCitation` objects (`source_doc`, `section`, `snippet`, `confidence`). **Citations are mandatory:** if nothing clears the confidence threshold, the case is forced to `manual_review` rather than answered ungrounded.

- [ ] Hybrid keyword (TF-IDF) + embedding-stub retrieval over **6 synthetic policy documents** — see [src/lib/rag/retrieve.ts](src/lib/rag/retrieve.ts) and [data/policies/](data/policies)
- [ ] Citation-or-manual-review guardrail enforced (no grounded citation ⇒ `manual_review`) — see [src/lib/ai/pipeline.ts](src/lib/ai/pipeline.ts)
- [ ] Full citation trail (source, section, snippet, confidence) shown to officers at `/officer/cases/[id]` — see [src/app/officer/cases/[id]](src/app/officer/cases)

### 2.3 E-Gov AI (workflow, routing, approval gates)
Department routing plus a status lifecycle and a non-bypassable supervisor approval gate for high-risk cases.

- [ ] Routing engine assigns the responsible department by category/urgency — see [src/lib/ai/routing.ts](src/lib/ai/routing.ts)
- [ ] Supervisor approval gate for high-risk cases (e.g. flood-risk drainage, high-PII) — see [src/lib/ai/approval.ts](src/lib/ai/approval.ts)
- [ ] Status lifecycle: `draft → needs_info → submitted → manual_review → routed → awaiting_supervisor → in_progress → closed`
- [ ] Guardrail: the AI **requests** approval but can never self-approve (`requested_by = ai_agent`, `decision_by` must differ) — see [src/lib/ai/approval.ts](src/lib/ai/approval.ts)
- [ ] Pending high-risk cases surface at `/officer/approvals` — see [src/app/officer/approvals/page.tsx](src/app/officer/approvals/page.tsx)

### 2.4 Multilingual LLMs
Native handling of the four Malaysian citizen languages: **Malay (ms), English (en), Simplified Chinese (zh), Tamil (ta)**.

- [ ] Language detection via Unicode script blocks + keyword heuristics — see [src/lib/ai/language.ts](src/lib/ai/language.ts)
- [ ] All citizen-facing strings localized for all four languages — see [src/lib/i18n.ts](src/lib/i18n.ts)
- [ ] Citizen reply drafted in the **detected** language (`CitizenReplyDraft.body_localized`)
- [ ] Optional Anthropic Claude path refines detection/classification **only** when `ANTHROPIC_API_KEY` is set; deterministic fallback otherwise — see [src/lib/llm.ts](src/lib/llm.ts)

### 2.5 Civic Tech (transparency & safety)
Governance is a first-class feature, not an afterthought.

- [ ] Append-only `AuditEvent` timeline records every state change (actor, event_type, summary, payload) at `/officer/audit` — see [src/lib/audit.ts](src/lib/audit.ts)
- [ ] Explicit human-decision boundary: AI never auto-closes cases, never auto-approves escalations, never decides eligibility — see [AGENTS.md:152](AGENTS.md)
- [ ] Deterministic-first design: full pipeline runs offline with no API key; optional LLM is a drop-in enhancement, never a requirement — see [AI_DISCLOSURE.md:52](AI_DISCLOSURE.md)
- [ ] Synthetic seed data re-seedable via `POST /api/reset` — see [data/seed/cases.json](data/seed/cases.json)

> **Honest scope note (carry into the pitch, do not hide):** the citizen agent is a one-way intake/triage tool, not a conversational agent; language coverage is tuned around the three demo cases and is not guaranteed equal across all four languages (see [MODEL_CARD.md §7](MODEL_CARD.md)); the RAG corpus is 6 short synthetic documents, not a production index. These are documented demo limitations, not defects.

---

## 3. Artifact Boundary — Synthetic Only

This is the most important integrity claim for a public e-gov demo. **All three boundaries must hold and be independently verifiable.**

### 3.1 No real citizen data
- [ ] Data classification stated as **"100% synthetic. Public-demo safe."** — see [DATA_CARD.md:6](DATA_CARD.md)
- [ ] No real NRIC: rendered only as masked placeholders (`XXXXXX-XX-XXXX`) — see [DATA_CARD.md](DATA_CARD.md), [privacy_controls.md:63](docs/privacy/privacy_controls.md)
- [ ] No real phone numbers: only obvious placeholders (`+60-XX-XXX-XXXX`)
- [ ] No real addresses: only fictional area-level labels (`Taman Demo`, `Jalan Demo`, `Jalan SS2` demo phrase) — see [data/seed/cases.json](data/seed/cases.json), [DATA_CARD.md:70](DATA_CARD.md)
- [ ] Seed cases confirmed fictional with invented names — see [data/seed/cases.json](data/seed/cases.json)

### 3.2 No real government SOPs
- [ ] All 6 policy documents are **"entirely invented for this demo … not real PBT service charters, not real council SOPs"** — see [DATA_CARD.md:35](DATA_CARD.md)
- [ ] Each policy doc carries a document-level disclaimer (e.g. drainage SOP marked `SYNTHETIC — demo only`, "does not represent any real council's standard operating procedure") — see [data/policies/drainage_response_sop.md:3](data/policies/drainage_response_sop.md)
- [ ] Documents have **no legal force** statement present — see [DATA_CARD.md](DATA_CARD.md)
- [ ] No source code, secrets, or proprietary modules copied from any reference repository — see [source_mapping.md:5](docs/reference/source_mapping.md)

### 3.3 No real / live government APIs
- [ ] System runs **fully offline by default** via deterministic TypeScript pipeline — see [src/lib/llm.ts](src/lib/llm.ts)
- [ ] Only external endpoint ever referenced is the **optional** Anthropic Messages API, used solely when `ANTHROPIC_API_KEY` is explicitly set — see [AI_DISCLOSURE.md:52](AI_DISCLOSURE.md)
- [ ] **No government API, endpoint, or live service** is called or integrated anywhere in the codebase
- [ ] `.env.example` ships the key commented out / blank; no default credentials — see [.env.example](.env.example)
- [ ] No committed `.env` / `.env.local` containing credentials

---

## 4. Verification Checklist

All gates below are reported as **passing** in the audit trail; re-run them on the submission machine before recording or pushing. Source of truth: [final_submission_packaging_check.md](docs/audit/final_submission_packaging_check.md), [launch_deploy_recheck_2026-06-14.md](docs/audit/launch_deploy_recheck_2026-06-14.md), [dependency_security_fix_report.md](docs/audit/dependency_security_fix_report.md), [gpt55_post_fix_reaudit.md](docs/audit/gpt55_post_fix_reaudit.md).

### 4.1 Build, types, tests, dependencies
- [ ] `npm run typecheck` — TypeScript compiles clean (`tsc --noEmit`)
- [ ] `npm test` — Vitest passes (**6 test files / 29 tests**, includes governance regression suite in `tests/lifecycle.test.ts`)
- [ ] `npm run build` — Next.js **15.5.19** production build completes; all routes build (`/m`, `/officer`, `/officer/cases/[id]`, `/officer/approvals`, `/officer/audit`, `/api/*`)
- [ ] `npm run lint` — passes (note: aliases to `tsc --noEmit`, not full ESLint)
- [ ] `npm audit --omit=dev --audit-level=moderate` — **0 vulnerabilities** in production deps; PostCSS pinned via `overrides` to `8.5.15` — see [package.json](package.json)

> Run order note: run `npm run build` **before** `npm run lint` separately — running them in parallel can transiently fail because lint reads `.next/types` while the build rewrites them.

### 4.2 Production server smoke test
Launch: `npm run build && npm run start -- --hostname 127.0.0.1 --port 3000` (use an alternate port such as 3004/3005 if 3000 is busy).
- [ ] `GET /m` → 200 (citizen app)
- [ ] `GET /officer` → 200 (officer console)
- [ ] `GET /officer/approvals` → 200 and `GET /officer/audit` → 200
- [ ] `POST /api/reset` → 200 with `{ ok: true, seeded_cases: 6 }`
- [ ] `GET /api/cases` → 200

### 4.3 Governance behavior (P0 — must hold)
- [ ] Malay flood-risk drainage case (`"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."`) → `awaiting_supervisor`; start/close blocked until a supervisor approves with a note
- [ ] Chinese food-stall licence query → `needs_info` with missing fields (location, business type, operating hours); start/close blocked
- [ ] English education-aid question (`"Can I apply for education aid for my child?"`) → `officer_review_only = true`; shows "Start officer review", no auto-approve / generic close
- [ ] Unknown/general enquiry with no qualifying citation → `manual_review`; start/close blocked
- [ ] Attempting a blocked status transition (e.g. `POST /api/cases/{id}/status` → `in_progress`) is rejected and logged as a `status.denied` audit event
- [ ] Officer UI hides unsafe status buttons on gated cases and shows the blocker reason
- [ ] `/officer/audit` shows the full per-case trail: language detection → classification → retrieval → routing → approval → reply draft → status changes (and denials)

### 4.4 Public-artifact safety
- [ ] Governance docs present and current: [AI_DISCLOSURE.md](AI_DISCLOSURE.md), [DATA_CARD.md](DATA_CARD.md), [MODEL_CARD.md](MODEL_CARD.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- [ ] No real API keys, credentials, or realistic PII in tracked files (placeholders only)
- [ ] `.gitignore` excludes `node_modules/`, `.next/`, `.claude/`, `*.tsbuildinfo`, `.env`, `*.log`; tracks `.env.example` — see [.gitignore](.gitignore)

---

## 5. Three-Minute Demo Recording Checklist

Exact timing source: [demo_script.md](docs/demo/demo_script.md). Last verified render: [english_video_rebuild_2026-06-15.md](docs/audit/english_video_rebuild_2026-06-15.md) (180.067 s, 1280×720, H.264 + AAC mono 48 kHz, en-US-AvaMultilingualNeural narration). Narration is **English throughout**; the app UI shows multilingual content.

### 5.1 Setup & reset (before every take)
- [ ] `npm install && npm run build`
- [ ] `npm run start -- --hostname 127.0.0.1 --port 3000` (note the actual port if not 3000)
- [ ] Confirm `/m` and `/officer` load
- [ ] Reset state: `npm run seed:reset` (or `curl -X POST http://127.0.0.1:3000/api/reset`)

### 5.2 Scene timing (8 sections, 180 s total)
- [ ] **0:00–0:15 Opening** — overview narration; citizen app + officer console side-by-side, no overlap
- [ ] **0:15–0:45 Malay drainage** — submit `"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat"`; show language = Malay, classification = drainage / flood-risk
- [ ] **0:45–1:15 SOP RAG + routing** — officer console: citation panel (Drainage Response SOP) + routing to Engineering/Drainage with flood-risk rationale
- [ ] **1:15–1:45 Approval gate** — show blocked start/close, open approval panel, enter decision note, approve, show it recorded in the audit timeline
- [ ] **1:45–2:10 Chinese business licence** — submit `"我要申请小食档执照，需要什么文件？"`; show `needs_info`, Chinese reply draft, missing fields
- [ ] **2:10–2:35 Education / welfare aid** — submit `"Can I apply for education aid for my child?"`; show welfare-policy retrieval + document checklist, **no auto-approval**
- [ ] **2:35–2:55 Audit trail** — `/officer/audit`: full traceable log across all three cases
- [ ] **2:55–3:00 Closing** — "AI drafts, humans decide, every case is traceable"

### 5.3 Encoding & QA
- [ ] Output MP4: H.264 video, 1280×720, AAC mono 48 kHz, ~180 s total
- [ ] Audio/video drift within tolerance; closing fits its 5-second window
- [ ] `ffprobe` confirms exactly one H.264 video stream + one AAC audio stream
- [ ] Spot-check frames (~0:05, 0:50, 1:50, 2:40, 2:58) for overlap / black frames / mislayout
- [ ] Record metadata JSON (section timings, TTS voice, encoding specs)
- [ ] Final video file present and playable — current artifact: `outputs/manual-20260615-civicflow-video-timed/video/civicflow-my-mobile-demo-edge-ava-3min-timed.mp4`

---

## 6. Public Repo Checklist

Source: public-repo readiness audit of [LICENSE](LICENSE), [.gitignore](.gitignore), [.env.example](.env.example), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [README.md](README.md), [AI_DISCLOSURE.md](AI_DISCLOSURE.md).

- [ ] **License**: MIT, full text, copyright 2026 — see [LICENSE](LICENSE) (also declared in [package.json](package.json))
- [ ] **.gitignore**: excludes `.env` / `.env.*`, `node_modules/`, `.next/`, build artifacts, IDE folders; negation `!.env.example` keeps the template tracked — see [.gitignore](.gitignore)
- [ ] **.env.example**: present, optional `ANTHROPIC_API_KEY` commented/blank, no real secrets — see [.env.example](.env.example)
- [ ] **Third-party notices**: all runtime/dev deps listed with MIT/Apache-2.0 licences; notes the Anthropic path uses built-in `fetch` (no bundled SDK) — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- [ ] **README**: prerequisites (Node 18+), install/dev/build/start, port guidance, test commands, optional-LLM explanation, demo walkthrough — see [README.md](README.md)
- [ ] **AI disclosure**: where AI is used, what it never does, determinism/fallback, human oversight, 100% synthetic — see [AI_DISCLOSURE.md](AI_DISCLOSURE.md)
- [ ] **No secrets in history**: `ANTHROPIC_API_KEY` appears only as a commented template; verify with `git log` / `git grep`
- [ ] **No build artifacts tracked**: `git ls-files` shows no `node_modules/`, `.next/`, `dist/`
- [ ] **`outputs/` untracked**: demo recordings stay out of the commit (confirm before pushing)
- [ ] **Pre-push**: `npm audit --omit=dev --audit-level=moderate`, `npm test`, `npm run typecheck` all clean

---

## 7. Final Submission Materials Checklist

Everything a judge should be able to find from the repository root.

- [ ] **Public repository** (GitHub) — section 6 complete, default branch builds clean
- [ ] **3-minute demo video** — section 5 complete; file rendered, QA'd, and either committed to release assets or linked from the README/submission form (decide hosting; `outputs/` is currently untracked)
- [ ] **README** as the entry point with quick-start and demo walkthrough — [README.md](README.md)
- [ ] **Architecture doc** — [architecture.md](docs/architecture/architecture.md)
- [ ] **Model card** — [MODEL_CARD.md](MODEL_CARD.md)
- [ ] **Data card** — [DATA_CARD.md](DATA_CARD.md)
- [ ] **AI disclosure** — [AI_DISCLOSURE.md](AI_DISCLOSURE.md)
- [ ] **Privacy controls** — [privacy_controls.md](docs/privacy/privacy_controls.md)
- [ ] **Third-party notices / license** — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [LICENSE](LICENSE)
- [ ] **Audit trail** demonstrating verification rigor — [docs/audit/](docs/audit)
- [ ] **This checklist** — [final_submission_checklist.md](docs/submission/final_submission_checklist.md)
- [ ] **Submission form fields** prepared: project name, T5 track, one-line pitch, repo URL, video URL, team info

---

## 8. Final Positioning Statement

**CivicFlow MY Mobile is a multilingual, citizen-first AI casework assistant for Malaysian local councils — built for MAIC T5 (Public Services & Smart Cities) to show that responsible e-government AI is achievable today.** A resident describes a problem in Malay, English, Chinese, or Tamil; the system detects the language, classifies and routes the case, grounds every recommendation in cited policy via RAG, and drafts a reply — while a hard governance layer guarantees that **AI drafts and humans decide**: high-risk cases are gated behind mandatory supervisor approval, ungrounded cases fall back to manual review, and every action is written to an append-only audit trail.

It is deliberately scoped as a **transparent public demo**: it runs fully offline with **100% synthetic data — no real citizen records, no real government SOPs, no live government APIs** — so it can be inspected, reproduced, and trusted by anyone. The contribution is not a black-box predictor but a **governable workflow**: explainable through citations, accountable through audit, and safe by construction through human-in-the-loop approval gates. That combination — multilingual access for citizens plus verifiable control for the council — is exactly the public-service outcome MAIC T5 is looking for.
