# MAIC Submission Materials - 2026-06-18

## Scope

This folder contains portal-ready materials for the MAIC Nexus Challenge application stage.

The materials are written in English because MAIC states that pitch deck, project summary, demo video, artifact documentation, presentations and Q&A must be in English.

## Files

- `project_summary_500_words.txt` - plain-text project summary, under the 500-word limit.
- `ai_disclosure_statement.txt` - plain-text AI disclosure statement, above the 100-word minimum.
- `final_submission_checklist.md` - broader repository checklist and evidence map.

Generated PDF attachments are written under `output/pdf/`:

- `civicflow-my-mobile-maic-pitch.pdf` - 12-slide pitch deck PDF.
- `civicflow-my-mobile-submission-brief.pdf` - summary and AI disclosure PDF backup.

## MAIC Rule Alignment

- Track: T5 - Public Services & Smart Cities.
- Mandatory application materials covered here: pitch deck PDF, project summary, AI usage disclosure.
- Optional but recommended materials still need final public URLs: demo video URL and artifact / repository URL.
- Artifact link must be publicly accessible without a login wall during judging windows.
- Repository artifacts should show at least three commits over at least two calendar days before the submission deadline.

## Judge-Facing Positioning

CivicFlow MY Mobile should be presented as a public-service casework platform, not as a generic chatbot. The strongest judging points are:

- Problem & Market Fit: fragmented multilingual citizen service intake, incomplete case submissions, weak SLA visibility and audit burden.
- Technical Innovation: deterministic AI/RAG pipeline, citation-or-manual-review guardrail, multilingual intake and human approval gates.
- Solution Maturity & Demo: working Next.js app with citizen mobile route, officer console, supervisor approvals, audit trail, tests and production build verification.
- Team & Execution: clear documentation, public-demo safety, dependency audit, repeatable local launch and verification evidence.
- Business Model & Impact: paid pilots for local councils, campuses, township operators and civic service desks that need faster triage, accountability and multilingual access.

## Product Roadmap Positioning

Use `docs/roadmap/product_roadmap.md` as the roadmap source of truth. The most valuable roadmap message is that CivicFlow becomes a governed integration layer for public-service operators, not a replacement for existing government systems.

The future product should connect to each agency's existing case-management database, work-order tooling, GIS / asset data, notification channels, SSO and approved SOP repositories through adapters. This makes the roadmap credible for real agencies because it acknowledges that every PBT, campus, township operator or civic service desk already has its own systems of record.

Do not claim these integrations already exist in the current artifact. The current artifact is a synthetic demo; the roadmap describes the path from demo to pilot to multi-agency production readiness.

## Remaining P0/P1 Dependency

The repository can generate and run the local artifact now. A public no-login hosted URL still requires a deployment account or repository hosting decision outside this checkout. Do not claim public deployment until that URL is configured and verified.

## 2026-06-18 Completion Evidence

- `project_summary_500_words.txt` checked at 355 words.
- `ai_disclosure_statement.txt` checked at 276 words.
- `output/pdf/civicflow-my-mobile-maic-pitch.pdf` generated with 12 pages.
- `output/pdf/civicflow-my-mobile-submission-brief.pdf` generated with 2 pages.
- PDF previews rendered under `output/pdf/previews/` and visually inspected.
- `npm run smoke:e2e` passed and generated screenshots under `output/playwright/maic-smoke/`.
- Full completion note: `docs/audit/p0_p1_submission_completion_2026-06-18.md`.
