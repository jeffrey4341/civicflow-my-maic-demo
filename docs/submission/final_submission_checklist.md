# CivicFlow MY Mobile — Final Submission Checklist (MAIC T5)

> **Status:** Product journeys locally verified; external submission delivery pending
> **Date:** 2026-08-02
> **Submission deadline:** **2026-09-01 00:00 MYT**
> **Track:** MAIC Nexus Challenge **T5 — Public Services & Smart Cities**
> **Artifact type:** Public hackathon demo. **100% synthetic data.** Runs fully offline, no API key required.
> **Scope of this document:** Documentation only. This checklist does **not** modify product code, the RAG pipeline, approval logic, audit logic, tests, dependencies, or UI behavior. It records what must be true for the artifact to be submission-ready and points to the source-of-truth files for each claim.

This file is the single pre-submission gate. Each box is something a reviewer or release engineer can independently confirm against the repository. Where a claim is asserted, the backing file is cited so nothing here has to be taken on faith.

---

## 1. T5 Track Alignment

CivicFlow MY Mobile is a mobile-first, multilingual **citizen-service AI casework platform** for Malaysian local councils (PBT). A citizen submits a free-text request in their own language; the system detects the language, classifies the case, retrieves grounding policy citations via RAG, recommends a department route, gates high-risk cases behind mandatory human approval, drafts a citizen reply in the detected language, and records every step on an append-only audit timeline.

This maps directly to **T5 — Public Services & Smart Cities**: it is an e-government service-delivery tool that improves citizen access and council triage speed while keeping a human accountable for every consequential decision.

- [x] Track label is stated exactly as **"MAIC Nexus Challenge T5 — Public Services & Smart Cities"** — see [README.md:3](../../README.md) and [architecture.md:3](../architecture/architecture.md)
- [x] Project name is stated exactly as **"CivicFlow MY Mobile"** — see [README.md:1](../../README.md)
- [x] Public-demo framing ("public hackathon demo, 100% synthetic data, runs offline") is consistent across [README.md](../../README.md), [AGENTS.md](../../AGENTS.md), and [AI_DISCLOSURE.md](../../AI_DISCLOSURE.md)
- [x] Problem statement and PBT (local-council) context are described in [README.md](../../README.md) and [architecture.md](../architecture/architecture.md)
- [x] Human-in-the-loop positioning ("AI drafts, humans decide") is reflected as a hard guardrail, not a slogan — see [AGENTS.md:152](../../AGENTS.md)

---

## 2. T5 Theme Mapping

Each MAIC T5 sub-theme maps to a concrete, auditable capability already implemented in the repository. The mapping below is the spine of the pitch and the demo.

### 2.1 Citizen Agents
A mobile-first intake agent turns an unstructured citizen request into a structured `CitizenCase`, detects missing information, and produces a draft reply — all before a human officer touches it.

- [x] Mobile citizen service at `/m`: new request or tracking, language confirmation, review-before-submit, and structured follow-up questions — see [src/app/m/page.tsx](../../src/app/m/page.tsx)
- [x] 8-stage triage pipeline orchestrated end-to-end — see [src/lib/ai/pipeline.ts](../../src/lib/ai/pipeline.ts)
- [x] Missing-information detection forces `needs_info` instead of guessing — see [src/lib/ai/pipeline.ts](../../src/lib/ai/pipeline.ts)

### 2.2 RAG (Retrieval-Augmented Generation)
Every recommendation is grounded in one or more `PolicyCitation` objects (`source_doc`, `section`, `snippet`, `confidence`). **Citations are mandatory:** if nothing clears the confidence threshold, the case is forced to `manual_review` rather than answered ungrounded.

- [x] Hybrid keyword (TF-IDF) + embedding-stub retrieval over **6 synthetic policy documents** — see [src/lib/rag/retrieve.ts](../../src/lib/rag/retrieve.ts) and [data/policies/](../../data/policies)
- [x] Citation-or-manual-review guardrail enforced (no grounded citation ⇒ `manual_review`) — see [src/lib/ai/pipeline.ts](../../src/lib/ai/pipeline.ts)
- [x] Full citation trail (source, section, snippet, confidence) shown to officers at `/officer/cases/[id]` — see [src/app/officer/cases/[id]](../../src/app/officer/cases)

### 2.3 E-Gov AI (workflow, routing, approval gates)
Department routing plus a status lifecycle and a non-bypassable supervisor approval gate for high-risk cases.

- [x] Routing engine assigns the responsible department by category/urgency — see [src/lib/ai/routing.ts](../../src/lib/ai/routing.ts)
- [x] Supervisor approval gate for high-risk cases (e.g. flood-risk drainage, high-PII) — see [src/lib/ai/approval.ts](../../src/lib/ai/approval.ts)
- [x] Status lifecycle: `draft → needs_info → submitted → manual_review → routed → awaiting_supervisor → in_progress → closed`
- [x] Guardrail: the AI **requests** approval but can never self-approve (`requested_by = ai_agent`, `decision_by` must differ) — see [src/lib/ai/approval.ts](../../src/lib/ai/approval.ts)
- [x] Pending high-risk cases surface at `/officer/approvals` — see [src/app/officer/approvals/page.tsx](../../src/app/officer/approvals/page.tsx)

### 2.4 Multilingual LLMs
Native handling of the four Malaysian citizen languages: **Malay (ms), English (en), Simplified Chinese (zh), Tamil (ta)**.

- [x] Language detection via Unicode script blocks + keyword heuristics — see [src/lib/ai/language.ts](../../src/lib/ai/language.ts)
- [x] Core citizen intake, follow-up, tracking and reply states are localized for all four languages; shared branding, skip-link and footer copy remain English in this English judging artifact — see [src/lib/i18n.ts](../../src/lib/i18n.ts) and [src/app/m/layout.tsx](../../src/app/m/layout.tsx)
- [x] Citizen reply drafted in the citizen-confirmed case language (`CitizenReplyDraft.language` / `CitizenReplyDraft.body`); detected language remains visible for review
- [x] Optional Anthropic Claude path may refine detected language, English translation, category and urgency **only** when `ANTHROPIC_API_KEY` is set; deterministic category-specific human gates cannot be downgraded — see [src/lib/llm.ts](../../src/lib/llm.ts) and [src/lib/ai/pipeline.ts](../../src/lib/ai/pipeline.ts)

### 2.5 Civic Tech (transparency & safety)
Governance is a first-class feature, not an afterthought.

- [x] Append-only `AuditEvent` records preserve actor, event type, summary and structured payload; `/officer/audit` exposes the actor/event/summary timeline while payload remains available through `/api/audit` — see [src/lib/audit.ts](../../src/lib/audit.ts)
- [x] Explicit human-decision boundary: AI never auto-closes cases, never auto-approves escalations, never decides eligibility — see [AGENTS.md:152](../../AGENTS.md)
- [x] Deterministic-first design: full pipeline runs offline with no API key; optional LLM is a drop-in enhancement, never a requirement — see [AI_DISCLOSURE.md:52](../../AI_DISCLOSURE.md)
- [x] Synthetic seed data re-seedable via `POST /api/reset` — see [data/seed/cases.json](../../data/seed/cases.json)

> **Honest scope note (carry into the pitch, do not hide):** the citizen agent is a one-way intake/triage tool, not a conversational agent; language coverage is tuned around the three demo cases and is not guaranteed equal across all four languages (see [MODEL_CARD.md §7](../../MODEL_CARD.md)); the RAG corpus is 6 short synthetic documents, not a production index. These are documented demo limitations, not defects.

---

## 3. Artifact Boundary — Synthetic Only

This is the most important integrity claim for a public e-gov demo. **All three boundaries must hold and be independently verifiable.**

### 3.1 No real citizen data
- [x] Data classification stated as **"100% synthetic. Public-demo safe."** — see [DATA_CARD.md:6](../../DATA_CARD.md)
- [x] No real NRIC: rendered only as masked placeholders (`XXXXXX-XX-XXXX`) — see [DATA_CARD.md](../../DATA_CARD.md), [privacy_controls.md:63](../privacy/privacy_controls.md)
- [x] No real phone numbers: only obvious placeholders (`+60-XX-XXX-XXXX`)
- [x] No real addresses: only fictional area-level labels (`Taman Demo`, `Jalan Demo`, `Jalan SS2` demo phrase) — see [data/seed/cases.json](../../data/seed/cases.json), [DATA_CARD.md:70](../../DATA_CARD.md)
- [x] Seed cases confirmed fictional with invented names — see [data/seed/cases.json](../../data/seed/cases.json)

### 3.2 No real government SOPs
- [x] All 6 policy documents are **"entirely invented for this demo … not real PBT service charters, not real council SOPs"** — see [DATA_CARD.md:35](../../DATA_CARD.md)
- [x] Each policy doc carries a document-level disclaimer (e.g. drainage SOP marked `SYNTHETIC — demo only`, "does not represent any real council's standard operating procedure") — see [data/policies/drainage_response_sop.md:3](../../data/policies/drainage_response_sop.md)
- [x] Documents have **no legal force** statement present — see [DATA_CARD.md](../../DATA_CARD.md)
- [x] No source code, secrets, or proprietary modules copied from any reference repository — see [source_mapping.md:5](../reference/source_mapping.md)

### 3.3 No real / live government APIs
- [x] System runs **fully offline by default** via deterministic TypeScript pipeline — see [src/lib/llm.ts](../../src/lib/llm.ts)
- [x] Only external endpoint ever referenced is the **optional** Anthropic Messages API, used solely when `ANTHROPIC_API_KEY` is explicitly set — see [AI_DISCLOSURE.md:52](../../AI_DISCLOSURE.md)
- [x] **No government API, endpoint, or live service** is called or integrated anywhere in the codebase
- [x] `.env.example` ships the key commented out / blank; no default credentials — see [.env.example](../../.env.example)
- [x] No committed `.env` / `.env.local` containing credentials

---

## 4. Verification Checklist

Re-run every gate on the exact submission tree before recording or pushing; current code and same-session command output are the source of truth. Historical references: [fable5_system_audit_2026-07-02.md](../audit/fable5_system_audit_2026-07-02.md) and [final_submission_packaging_check.md](../audit/final_submission_packaging_check.md).

### 4.1 Build, types, tests, dependencies
- [x] `npm run typecheck` — TypeScript compiles clean (`tsc --noEmit`)
- [x] `npm test` — Vitest passes (**10 test files / 76 tests**, including governance, LLM parity/fail-safe fallback, RAG evaluation, citizen detail integrity, and officer lifecycle review)
- [x] `npm run build` — Next.js **15.5.22** production build completes; all routes build (`/m`, `/officer`, `/officer/cases/[id]`, `/officer/approvals`, `/officer/audit`, `/api/*`)
- [x] `npm run smoke:citizen` — real 320 px mobile flow covers keyboard tabs, language mismatch confirmation, needs-info submission, structured follow-up, tracking, and overflow checks
- [x] `npm run smoke:officer` — real staff flow covers search/default closed filtering, Enter-key policy search without review submission, officer review, reply sending, explicit work start, and note-gated closure
- [x] `npm run smoke:e2e` — production-server smoke covers the three canonical journeys, the manual-review negative control, closure/immutability gates, and **10 rendered views**
- [x] `npm audit --omit=dev --audit-level=moderate` — **0 vulnerabilities** in production deps; PostCSS and Sharp pinned via `overrides` to `8.5.18` and `0.35.3`; Node.js **20.9+** required — see [package.json](../../package.json)

### 4.2 Production server smoke test
Launch: `npm run build && npm run start -- --hostname 127.0.0.1 --port 3000` (use an alternate port such as 3015 if 3000 is busy).
- [x] `GET /m` → 200 (citizen app)
- [x] `GET /officer` → 200 (officer console)
- [x] `GET /officer/approvals` → 200 and `GET /officer/audit` → 200
- [x] `GET /api/cases` → 200 and `GET /api/audit` → 200
- [x] `POST /api/reset` → 200 with `{ ok: true, seeded_cases: 6 }`

### 4.3 Canonical journeys and governance behavior (P0 — verified locally on 2026-08-02)
- [x] Malay flood-risk drainage case (`"Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."`) preserves the Drainage Response SOP evidence and officer-reviewed reply through supervisor approval, reply release, work start and human closure
- [x] Chinese food-stall licence query enters `needs_info`; location, business type and operating hours are supplied in the same case, the new revision returns to officer review, and separate reply-release, work-start and note-gated closure actions complete the citizen-visible journey
- [x] English education-aid question (`"Can I apply for education aid for my child?"`) remains `officer_review_only`; the outcome-sensitive path requires a recorded human welfare outcome and never creates an AI eligibility decision
- [x] Unknown/general enquiry with no qualifying citation falls back to `manual_review`; start and close remain blocked
- [x] Blocked status transitions are rejected and recorded as denied/held audit events instead of being silently accepted
- [x] Officer UI orders cases by **Next required action** and keeps review, supervisor decision, reply sending, start work and note-gated closure as separate controls with visible blocker reasons
- [x] `/officer/audit` exposes the per-case automated and human event trail, including retrieval, review, approval, reply release, status changes and denied transitions

### 4.4 Public-artifact safety
- [x] Governance docs present and current: [AI_DISCLOSURE.md](../../AI_DISCLOSURE.md), [DATA_CARD.md](../../DATA_CARD.md), [MODEL_CARD.md](../../MODEL_CARD.md), [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)
- [x] No real API keys, credentials, or realistic PII in tracked files (placeholders only)
- [x] `.gitignore` excludes `node_modules/`, `.next/`, `.claude/`, `*.tsbuildinfo`, `.env`, `*.log`; tracks `.env.example` — see [.gitignore](../../.gitignore)

---

## 5. 179-Second Demo Recording Checklist

Exact timing source: [demo_script.md](../demo/demo_script.md). The current-UI render is verified at `179.000000` seconds with 10 real UI scenes. The legacy June render documented in [english_video_rebuild_2026-06-15.md](../audit/english_video_rebuild_2026-06-15.md) is `180.067` seconds and uses generated text-card visuals; it is retained as history, not treated as the final submission video. Narration is **English throughout** while the app UI demonstrates multilingual content. The final video is available as a [public release asset](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/download/maic-preliminary-2026-08-02/civicflow-my-mobile-real-ui-demo-179s.mp4).

### 5.1 Setup & reset (before every take)
- [x] Dependencies are installed and `npm run build` completes
- [x] A production server starts on `127.0.0.1:3012` for the final e2e smoke
- [x] Confirm `/m` and `/officer` load
- [x] Reset synthetic state through `POST /api/reset`

### 5.2 Scene timing (10 sections, nominal 179 s total)
- [x] **0:00–0:14 Opening** — product promise on the current role launcher
- [x] **0:14–0:31 Citizen intake** — four-language request entry and review-before-submit
- [x] **0:31–0:47 Officer queue** — cases organised by the next required human action
- [x] **0:47–1:10 Malay governed flow** — cited routing, officer review and the flood-risk supervisor checkpoint
- [x] **1:10–1:32 Chinese missing details** — location, business type and operating hours resolved in the same case
- [x] **1:32–1:52 Chinese governed completion** — review, reply release, work start and closure remain separate
- [x] **1:52–2:07 Citizen-visible Chinese reply** — multilingual response with policy references and demo boundary
- [x] **2:07–2:27 Welfare outcome gate** — evidence supports a separately recorded human decision
- [x] **2:27–2:42 Approval history** — documented supervisor decision and case linkage
- [x] **2:42–2:59 Audit and closing** — automated and human events in one traceable timeline

### 5.3 Encoding & QA
- [x] Output MP4: H.264 video, 1280×720, yuv420p, 30 fps, AAC mono 48 kHz and actual container duration `179.000000` s
- [x] Section-locked audio is aligned to the 10 scene durations; maximum speed-up remains approximately 1.20×
- [x] `ffprobe` confirms exactly one H.264 video stream + one AAC audio stream
- [x] Full audio/video decode succeeds and 10 scene-midpoint frames contain no black frames, stale UI or unreadable full-page scaling
- [x] Portable metadata JSON records section timings, TTS voice, encoding specs and SHA-256 `517DC0710E56A675732D9DD8D95F5967E7E9D03549D4C9999C2B6272452D5342`
- [x] Public upload exists and plays without a login wall — [179-second MP4](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/download/maic-preliminary-2026-08-02/civicflow-my-mobile-real-ui-demo-179s.mp4), HTTP 200 on 2026-08-02

---

## 6. Public Repo Checklist

Source: public-repo readiness audit of [LICENSE](../../LICENSE), [.gitignore](../../.gitignore), [.env.example](../../.env.example), [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md), [README.md](../../README.md), [AI_DISCLOSURE.md](../../AI_DISCLOSURE.md).

- [x] **License**: MIT, full text, copyright 2026 — see [LICENSE](../../LICENSE) (also declared in [package.json](../../package.json))
- [x] **.gitignore**: excludes `.env` / `.env.*`, `node_modules/`, `.next/`, build artifacts, IDE folders; negation `!.env.example` keeps the template tracked — see [.gitignore](../../.gitignore)
- [x] **.env.example**: present, optional `ANTHROPIC_API_KEY` commented/blank, no real secrets — see [.env.example](../../.env.example)
- [x] **Third-party notices**: all app runtime/dev dependencies are listed; optional external video-authoring requirements and the Anthropic built-in-`fetch` path are disclosed separately — see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)
- [x] **README**: prerequisites (Node 20.9+), install/dev/build/start, port guidance, test commands, optional-LLM explanation, demo walkthrough — see [README.md](../../README.md)
- [x] **AI disclosure**: where AI is used, what it never does, determinism/fallback, human oversight, 100% synthetic — see [AI_DISCLOSURE.md](../../AI_DISCLOSURE.md)
- [x] **No secrets in history**: key-shaped history scan returned 0 matches
- [x] **No build artifacts tracked**: `git ls-files` shows no `node_modules/`, `.next/`, `dist/`, `output/` or `outputs/`
- [x] **`output/` and `outputs/` untracked**: generated demo materials stay out of the commit
- [x] **Pre-push**: `npm audit --omit=dev --audit-level=moderate`, `npm test`, `npm run typecheck` all clean

---

## 7. Final Submission Materials Checklist

Everything a judge should be able to find from the repository root.

**Hard deadline:** complete and confirm the portal submission before **2026-09-01 00:00 MYT**. A local file or local-only URL is not submission evidence.

- [x] **Public repository** (GitHub) — [jeffrey4341/civicflow-my-maic-demo](https://github.com/jeffrey4341/civicflow-my-maic-demo); section 6 complete and the merged tree passed the local production build gate
- [ ] **Public no-login demo deployment and portal URL** — pending. Establish a stable endpoint and verify it with `CIVICFLOW_BASE_URL=<url> npm run smoke:e2e`; a quick-tunnel URL is not a stable judging endpoint. Runbook: [railway_portal_runbook.md](../deployment/railway_portal_runbook.md)
- [x] **179-second English demo video public URL** — [public MP4](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/download/maic-preliminary-2026-08-02/civicflow-my-mobile-real-ui-demo-179s.mp4), verified at `179.000000` seconds and HTTP 200 without authentication
- [x] **README** as the entry point with quick-start and demo walkthrough — [README.md](../../README.md)
- [x] **Architecture doc** — [architecture.md](../architecture/architecture.md)
- [x] **Model card** — [MODEL_CARD.md](../../MODEL_CARD.md)
- [x] **Data card** — [DATA_CARD.md](../../DATA_CARD.md)
- [x] **AI disclosure** — [AI_DISCLOSURE.md](../../AI_DISCLOSURE.md)
- [x] **Privacy controls** — [privacy_controls.md](../privacy/privacy_controls.md)
- [x] **Third-party notices / license** — [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md), [LICENSE](../../LICENSE)
- [x] **Audit trail** demonstrating verification rigor — [docs/audit/](../audit)
- [x] **This checklist** — [final_submission_checklist.md](final_submission_checklist.md)
- [ ] **Submission form fields** prepared: project name, T5 track, one-line pitch, repo URL, public demo URL, video URL and team info
- [ ] **MAIC portal submitted and confirmation captured** before `2026-09-01 00:00 MYT`

---

## 8. Final Positioning Statement

**CivicFlow MY Mobile is a multilingual, citizen-first AI casework assistant for Malaysian local councils — built for MAIC T5 (Public Services & Smart Cities) to turn an unstructured request into policy-cited, human-owned and audited casework.** A resident describes a problem in Malay, English, Chinese or Tamil; the system structures the request, retrieves selected synthetic policy evidence and shows the next required human action. High-risk cases require a supervisor, missing information stays in the same citizen case, welfare outcomes require a human officer, and ungrounded work falls back to manual review.

It is deliberately scoped as a **transparent public demo**: it runs offline with **100% synthetic data — no real citizen records, no real government SOPs and no live government APIs**. Saving a review does not send a reply, approval does not start work, and AI never closes a case or decides eligibility. The process-scoped audit trail records the demo's automated and human actions until reset or restart. The core contribution is not a black-box predictor but a governable workflow in which **AI drafts, humans decide and every consequential transition is visible**.
