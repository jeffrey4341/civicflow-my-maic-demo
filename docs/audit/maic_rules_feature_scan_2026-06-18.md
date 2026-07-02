# MAIC Rules Feature Scan - 2026-06-18

## Verdict

**Advance submission evidence and scoring-support work, not broad new product scope.**

CivicFlow MY Mobile remains aligned with MAIC Nexus Challenge **T5 - Public Services & Smart Cities** because the implemented artifact is a multilingual public-service casework workflow with citizen intake, RAG citations, routing, supervisor approval gates, reply drafts, and append-only audit evidence.

The current codebase is launchable as a local production Next.js artifact. The next safest work is to improve public judging evidence, demo accessibility, and already documented follow-ups. Do not add unrelated features outside the existing T5/civic-service workflow.

## MAIC Rules Checked

Source pages checked on 2026-06-18:

- `https://maicnexus.com/en`
- `https://maicnexus.com/en/tracks`
- `https://maicnexus.com/en/register`
- `https://maicnexus.com/en/faq`
- `https://maicnexus.com/en/terms`

Relevant constraints:

- One team selects one industry from T1-T6; the industry is locked at submission.
- T5 is Public Services & Smart Cities: citizen services, smart cities, education AI, government modernisation, civic tech, RAG, e-gov AI, multilingual LLMs, and citizen agents are in-scope.
- Application-stage required materials are pitch deck, project summary, and AI usage disclosure. Demo video, artifact link, and member profiles are useful judging assets.
- Written materials, artifact documentation, demo video, presentations, and Q&A should be in English.
- Artifact links must be publicly accessible during judging windows. Private repositories, gated demos, or login-walled artifacts can be treated as non-submissions.
- Repository artifacts should show at least three commits over at least two calendar days before the submission deadline.
- Preliminary judging emphasizes Technical Feasibility, Commercial Viability, Industry Relevance, Scalability, and ESG / National Impact.
- Teams must not materially diverge from the declared industry track.

## Current Verification

Commands re-run from the current checkout:

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS - 6 files / 29 tests |
| `npm audit --omit=dev --audit-level=moderate` | PASS - found 0 vulnerabilities |
| `npm run build` | PASS - Next.js 15.5.19 production build |
| Production server smoke on `127.0.0.1:3010` | PASS |

Production smoke endpoints:

- `GET /m` -> 200
- `GET /officer` -> 200
- `GET /officer/approvals` -> 200
- `GET /officer/audit` -> 200
- `POST /api/reset` -> 200, `{"ok":true,"seeded_cases":6}`
- `GET /api/cases` -> 200

The temporary production server was stopped after the smoke test.

## Features / Work That Can Be Advanced

### P0 - Submission-readiness work

1. **Public artifact access**
   - Prepare a public, no-login artifact path for judging: hosted demo URL, public repository URL, release asset, or equivalent.
   - Keep the app framed as a synthetic hackathon demo, not a production government deployment.

2. **English submission package**
   - Keep the pitch deck, project summary, AI disclosure, demo video narration, README entry points, and artifact documentation in English.
   - The app itself can remain multilingual because multilingual citizen access is core to T5.

3. **MAIC materials checklist**
   - Finalize the 12-slide pitch deck PDF.
   - Prepare a plain-text project summary under 500 words.
   - Keep `AI_DISCLOSURE.md` current and easy to find.
   - Decide where the 3-minute demo MP4 is hosted or linked, because `outputs/` remains untracked.

4. **Public repo / commit evidence**
   - Preserve a clean public Git history with at least three commits over at least two calendar days if submitting the repository as the artifact.
   - Ensure generated folders and local recordings are not accidentally committed unless intentionally published as release assets.

### P1 - Score-improving work already within scope

1. **Browser smoke / e2e proof**
   - Add a small Playwright smoke suite for `/m`, `/officer`, case detail, approval, and audit.
   - This directly strengthens Technical Feasibility and Solution Maturity without changing product scope.

2. **Demo-hosting verification**
   - Add a deployment verification note once an external Vercel/cloud/static artifact URL exists.
   - The app already launches locally; external deployment still needs credentials/project configuration outside this repository.

3. **Commercial / adoption evidence**
   - Improve pitch/package content around who pays, pilot motion, council adoption path, and operating model.
   - Keep it non-fabricated; do not invent signed customers, real council endorsements, or official government partnerships.

4. **Scalability narrative**
   - Document the path from single synthetic `Majlis Demo` mode to multi-PBT deployment.
   - A minimal future `pbt_id` / `agency_id` field remains a reasonable semi-finals follow-up if implemented carefully.

5. **Mobile/demo polish**
   - Keep citizen-facing labels localized.
   - Keep officer/supervisor actions clearly marked as demo roles.
   - Keep Chinese/Tamil/Malay copy polished without changing the governance model.

### P2 - Semi-finals follow-ups, if time permits

1. **Minimal agency boundary**
   - Add `pbt_id` / `agency_id` only if the scope stays as public-service casework.
   - This supports scalability but should not become a generic multi-tenant enterprise platform.

2. **Audit evidence depth**
   - Consider showing citation payload links/details inside audit events.
   - Do not weaken append-only audit behavior.

3. **Hosted artifact hardening**
   - Add a deployment checklist covering public access, no auth wall, reset path, synthetic-data notice, and no secrets.

## Features / Work Not To Advance

- Do not pivot to another MAIC industry track after T5 positioning.
- Do not add generic chatbot behavior that bypasses the structured casework pipeline.
- Do not add real citizen data, real NRIC, real phone numbers, real addresses, real council SOPs, or live government APIs.
- Do not imply production readiness, official council adoption, official government endorsement, or PDPA compliance certification.
- Do not add autonomous closure, autonomous eligibility approval, autonomous field dispatch, or AI approval of high-risk cases.
- Do not add enterprise modules unrelated to T5 public services, such as finance/AP, HR, ERP, banking, manufacturing, or generic Agent OS capabilities.

## Recommended Next Action

Treat the application code as currently launchable. The next work should be:

1. Finish and publish the English submission package.
2. Add browser/e2e smoke proof.
3. Configure and verify a public no-login artifact URL.
4. Update the final submission checklist with the current pass/fail evidence once those artifact links are known.
