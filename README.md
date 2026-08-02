# CivicFlow MY Mobile

**MAIC Nexus Challenge T5 — Public Services & Smart Cities**

A working hackathon prototype for multilingual local-council casework in Malaysia.

> Public demo only. Every case, policy and identity in this repository is synthetic. CivicFlow is not an official council service and is not production-ready.

## Why we built it

Citizen requests have to be understood, routed to the right team, checked against procedure and answered clearly. Malaysian councils already handle this work through services such as [SISPAA](https://www.mppd.gov.my/en/citizens/e-services/e-complaint) and [PBTCare](https://www.kpkt.gov.my/index.php/pages/view/361?mid=592).

CivicFlow does not claim to replace those systems. It explores one narrower idea: can multilingual intake, policy evidence and human review sit in one traceable case workflow?

A citizen can write in Malay, English, Chinese or Tamil. The prototype structures the request, suggests a category and council team, finds relevant sections in a synthetic policy set and prepares a reply. An officer checks that work. High-risk cases stop for a supervisor. Nothing is sent, started or closed automatically.

## Hackathon entry

| | |
| --- | --- |
| Challenge | [MAIC Nexus Challenge](https://www.maicnexus.com/en) |
| Theme | T5 — Public Services & Smart Cities |
| Focus | A multilingual, traceable citizen-case workflow |
| Deliverable | Mobile citizen intake, officer workspace and supervisor approval flow |
| Current status | Working synthetic prototype; no agency pilot, adoption or performance claim |
| Public repository | [github.com/jeffrey4341/civicflow-my-maic-demo](https://github.com/jeffrey4341/civicflow-my-maic-demo) |
| Preliminary package | [Pitch, 179-second demo, summary and AI disclosure](https://github.com/jeffrey4341/civicflow-my-maic-demo/releases/tag/maic-preliminary-2026-08-02) |

It runs locally without an API key and includes repeatable tests for its core governance paths.

## 90-second walkthrough

1. Open `/m`, choose **Bahasa Melayu** and enter:

   > Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.

2. Review the detected service and submit the request. Keep the generated tracking code.
3. Open `/officer`. The new drainage case appears with its suggested team, flood-risk flag and policy sections.
4. Save the officer review, then open `/officer/approvals` and record the supervisor decision.
5. Return to the case, send the reviewed reply, start work and close the case with a note.
6. Use the citizen tracking page to see the final status and the released Malay reply with its cited policy sections.

This path makes the key boundary visible: the system prepares the case; people decide.

## Two additional demo paths

| Citizen request | What the prototype demonstrates | Required human action |
| --- | --- | --- |
| Chinese food-stall licence question | Chinese intake, licensing citation and missing-information checklist | Citizen clarification and officer review |
| English education-aid question | Welfare routing and supporting-document checklist | Officer review; no automatic eligibility decision |

## What works today

- Mobile request submission and tracking in Malay, English, Chinese and Tamil.
- Deterministic classification, missing-information checks and retrieval from six synthetic policy documents.
- An officer queue organised around the next required human action.
- Case review with editable routing, selected policy evidence and a citizen reply draft.
- A separate supervisor queue for high-risk cases.
- Separate controls for reviewing, sending, starting work and closing a case.
- A process-scoped, in-memory event timeline for automated steps and human actions, retained until reset or restart.
- Offline operation by default, with reproducible fixtures and no API key.

The default engine is a deterministic TypeScript pipeline. If `ANTHROPIC_API_KEY` is provided, language detection, English translation, category and urgency may use optional model refinement while the deterministic safety gates remain authoritative. Retrieval, routing, missing-information checks, approvals, reply drafting and audit recording remain application logic. In either mode, generated material remains a draft until a person reviews it.

## Workflow and safeguards

```text
citizen request
  -> language and category suggestion
  -> synthetic policy retrieval
  -> routing and missing-information checks
  -> officer review
  -> supervisor decision when high-risk
  -> officer sends reply
  -> officer starts and closes work
```

- A routing recommendation must include selected policy evidence or stay in manual review.
- High-risk cases cannot proceed without a documented supervisor decision.
- Saving an officer review does not send the reply.
- Approving a high-risk case does not start council work.
- Closing an actionable case requires a sent reply, work in progress and a closure note.
- The prototype never decides welfare or licensing eligibility, dispatches a field team or closes a case on its own.

## Run locally

**Requirements:** Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/m](http://localhost:3000/m) for citizen services or [http://localhost:3000/officer](http://localhost:3000/officer) for the staff workspace.

For a production-mode local demo:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Quick-tunnel URLs expire when their process stops, so this README does not present one as a permanent public endpoint.

Regenerating the optional 179-second submission video with `npm run demo:video` also requires Python with `edge-tts`, network access to its speech service, and `ffmpeg` / `ffprobe`. These authoring tools are not needed to build, test or run the app.

## Main routes

| Route | Purpose |
| --- | --- |
| `/m` | Submit or track a citizen request |
| `/officer` | Review the active case queue |
| `/officer/cases/[id]` | Review facts, evidence, reply and case actions |
| `/officer/approvals` | Decide high-risk approval tasks |
| `/officer/audit` | Inspect the cross-case event timeline |
| `POST /api/reset` | Restore the synthetic in-memory demo state |

## Verify the artifact

```bash
npm run typecheck
npm test
npm run build
npm run smoke:citizen
npm run smoke:officer
npm run smoke:e2e
npm audit --omit=dev --audit-level=moderate
```

The smoke scripts start and stop their own local servers. The dependency audit is a separate hard gate and should be reviewed before any hosted demonstration.

## Deliberate limits

- All shipped cases, names, locations and policies are fictional demo material.
- There is no authentication: officer and supervisor names are client-asserted demo roles.
- State is held in memory. `POST /api/reset` is intentionally open and clears the event timeline.
- “Send reply” and “start work” change the demo workflow only; there is no SMS, WhatsApp, GIS or field-work integration.
- The multilingual rules are tuned to the included examples and have no formal accuracy, fairness or performance evaluation.
- The current dependency audit must be clean or explicitly risk-accepted before exposing a shared instance.

Do not enter real citizen information or use this repository for real council decisions.

## Stack

Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, Next.js route handlers, an in-memory store and Vitest. The application is intentionally one repository and one process for the hackathon demo.

## Project notes

- [Demo script](./docs/demo/demo_script.md)
- [MAIC submission materials](./docs/submission/maic_submission_materials_2026-06-18.md)
- [Product scope](./PRODUCT.md)
- [AI disclosure](./AI_DISCLOSURE.md)
- [Data card](./DATA_CARD.md)
- [Model card](./MODEL_CARD.md)
- [Roadmap from demo to controlled pilot](./docs/roadmap/product_roadmap.md)
