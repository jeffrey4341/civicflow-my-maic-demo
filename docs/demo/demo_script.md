# CivicFlow MY Mobile — 179-Second Demo Script

**MAIC Nexus Challenge T5 — Public Services & Smart Cities**

> **Important:** All data is 100% synthetic. No real citizen data, NRIC, addresses, phone numbers or government SOPs are used. The judging path runs offline with deterministic AI fallbacks and no API key. The submission deadline is **2026-09-01 00:00 MYT**.

## Recording status

The current product journeys and governance checks are locally verified. The current-UI video was rendered and verified on **2026-08-02** at the ignored local path `output/demo-video/civicflow-real-ui-179s/video/civicflow-my-mobile-real-ui-demo-179s.mp4` and published in the [MAIC preliminary release](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/tag/maic-preliminary-2026-08-02). The 180.067-second June render remains historical evidence and is not the final submission video.

Verified encoding: H.264 video, 1280×720, yuv420p, 30 fps; AAC mono 48 kHz; `ffprobe` container duration **179.000000 seconds**. Full audio/video decode and ten scene-midpoint frames completed with exit 0. SHA-256: `517DC0710E56A675732D9DD8D95F5967E7E9D03549D4C9999C2B6272452D5342`. The [public MP4](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/download/maic-preliminary-2026-08-02/civicflow-my-mobile-real-ui-demo-179s.mp4) was verified without a login wall.

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

If port `3000` is occupied, use the same command with another available port. Never stop a process that was not started for this recording.

Before each take, reset to a known synthetic state:

```bash
npm run seed:reset
```

or:

```bash
curl -X POST http://127.0.0.1:3000/api/reset
```

Use the matching port if not using `3000`.

---

## 0:00-0:14 — Opening: casework, not chat

Show the current role launcher.

“CivicFlow MY is a public-service casework demo for Malaysian councils. This walkthrough uses the real product interface and synthetic data only. Citizens submit requests, officers review recommendations, and supervisors decide high-risk cases.”

---

## 0:14-0:31 — Citizen intake

Show `/m`, the four language choices, request field and review-before-submit flow.

“The citizen flow begins with four languages: Bahasa Melayu, English, Chinese, and Tamil. A person writes in their own words or starts from a guided example. The system detects language and service category before submission, without requiring an external model.”

---

## 0:31-0:47 — Officer queue

Show `/officer` and the next-required-action grouping.

“The officer queue turns mixed-language requests into an actionable workload. Each row shows the original request, a translated reference where needed, the service, route, status, risk, and the next required human action.”

---

## 0:47-1:10 — Malay drainage: evidence, routing and the human gate

Use the synthetic request:

```text
Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.
```

Show Malay detection, flood-risk classification, the Drainage Response SOP citation and Engineering / Drainage Unit recommendation.

“Here is the governed Malay drainage flow. Deterministic triage detects Malay, classifies drainage and flooding, retrieves cited policy, and recommends the Engineering Drainage Unit. Flood risk triggers a supervisor checkpoint. The officer reviews the facts and reply; the system never dispatches work or closes the case by itself.”

---

## 1:10-1:32 — Chinese licence: missing details

Show the first licence revision, the three missing fields and the revised officer-review state.

“For a Chinese food-stall licence enquiry, the first revision is not treated as complete. CivicFlow identifies missing location, business type, and operating hours, then asks once for the required details. After the citizen supplies them, the officer reviews the updated facts, three cited FAQ sections, routing, and the Chinese reply draft.”

---

## 1:32-1:52 — Chinese licence: governed completion

Use the synthetic request:

```text
我要申请小食档执照，需要什么文件？
```

Show the same case after officer review, reply release, work start and human closure.

“Once the licence case is reviewed, the officer can release the reply and record the work outcome. The citizen sees a Chinese response backed by the same policy citations. Saving a review does not silently send anything: review, send, start work, and close remain separate human actions.”

---

## 1:52-2:07 — Citizen-visible Chinese reply

Show the Chinese citizen reply and its policy references.

“The citizen-facing reply keeps the official department and policy references visible in Chinese. It also says this is a demo and not a real licence approval. That distinction is central: AI drafts service guidance; public officers remain accountable for decisions.”

---

## 2:07-2:27 — Welfare: human outcome gate

Use the synthetic request:

```text
Can I apply for education aid for my child?
```

Show the Welfare Education Aid Policy evidence and the separately recorded human outcome.

“Education aid follows a different boundary. CivicFlow retrieves the welfare policy and prepares evidence for review, but it never decides eligibility. The screen records the human welfare outcome separately from automated classification and routing, then preserves the complete case history.”

---

## 2:27-2:42 — Supervisor decision history

Open `/officer/approvals` and show the drainage decision in history with its case reference and decision note.

“High-risk approvals have their own workspace. Flood-risk recommendations remain blocked until the current officer-reviewed revision receives a documented supervisor decision. The history shows who approved, what was approved, and which revision the decision applies to.”

---

## 2:42-2:59 — Audit and closing

Open `/officer/audit` and show a case-level sequence containing automated stages, human actions and a denied or held transition.

“Finally, the append-only audit joins every automated and human event, from submission through routing, approval, replies, and status changes. CivicFlow combines multilingual intake, cited recommendations, explicit human checkpoints, and traceable casework in an offline-ready public demo.”

---

## Final recording gate

- [x] Render against the current verified UI, not the superseded generated text cards.
- [x] Confirm nominal duration is 179 seconds and `ffprobe` reports an actual duration of `179.000000` seconds.
- [x] Decode the full MP4 and inspect ten scene-midpoint frames for black frames, overlap, stale UI and unreadable crops.
- [x] Confirm narration is English throughout while multilingual citizen content remains legible.
- [x] Upload to a stable public judging URL and verify playback without a login wall — [public MP4](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/download/maic-preliminary-2026-08-02/civicflow-my-mobile-real-ui-demo-179s.mp4), HTTP 200 on 2026-08-02.
- [x] Record the final local video path, portable metadata and SHA-256 `517DC0710E56A675732D9DD8D95F5967E7E9D03549D4C9999C2B6272452D5342` in this verification record.
- [x] Record direct portal evidence — [screenshot](../audit/maic_portal_materials_saved_2026-08-24.png): the application is `Submitted`; final materials are saved and visible; the dashboard has no separate `Finalize` / `Submit` control and remains editable until the automatic materials lock on `2026-09-01 00:00 MYT`.
