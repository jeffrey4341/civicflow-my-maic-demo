# P0/P1 Submission Completion - 2026-06-18

## Verdict

**P0 submission materials are complete for the repository artifact. P1 browser-smoke evidence is complete locally.**

The remaining external dependency is a public no-login artifact URL. This repository can generate the required PDF and text materials and can launch a verified local production app, but a hosted URL still requires a deployment target or repository hosting decision outside this checkout.

## P0 Completed

### Pitch deck PDF

- Generated: `output/pdf/civicflow-my-mobile-maic-pitch.pdf`
- Format: 12-slide PDF, aligned with the MAIC application limit.
- Positioning: T5 - Public Services & Smart Cities.
- Judge-facing focus: problem fit, technical AI depth, working demo, governance, market path and impact.
- Source script: `scripts/submission/generate_maic_submission_pdfs.py`

### Project summary

- Generated: `docs/submission/project_summary_500_words.txt`
- Format: plain text.
- Word count: 355 words, below MAIC's 500-word application limit.

### AI disclosure statement

- Generated: `docs/submission/ai_disclosure_statement.txt`
- Format: plain text.
- Word count: 276 words, above MAIC's 100-word minimum.
- Covers: AI usage, deterministic fallback, optional Anthropic path, human decision boundaries, synthetic data and team responsibility.

### Submission brief PDF

- Generated: `output/pdf/civicflow-my-mobile-submission-brief.pdf`
- Purpose: attachment backup containing the summary and AI disclosure in a readable PDF.
- Page count: 2 pages.

## PDF Verification

Used the PDF skill workflow with ReportLab generation and pypdfium2 rendering because Poppler (`pdftoppm` / `pdfinfo`) was not available in PATH or the bundled bin directory.

Checks completed:

- Pitch PDF page count: 12.
- Brief PDF page count: 2.
- Text extraction succeeded for both PDFs.
- Rendered page previews to `output/pdf/previews/`.
- Visual contact sheets inspected:
  - `output/pdf/previews/civicflow-my-mobile-maic-pitch-contact-sheet.png`
  - `output/pdf/previews/civicflow-my-mobile-submission-brief-contact-sheet.png`
- Corrected an initial cover-slide text overlap before finalizing the deck PDF.

## P1 Completed

### Browser e2e smoke

- Added script: `scripts/smoke/maic_e2e_smoke.mjs`
- Added npm command: `npm run smoke:e2e`
- Screenshot output: `output/playwright/maic-smoke/`
- Contact sheet: `output/playwright/maic-smoke/contact-sheet.png`

Coverage:

- Starts a temporary production Next.js server.
- Resets demo state through `POST /api/reset`.
- Creates the Malay flood-risk drainage case and verifies `awaiting_supervisor`, citations and pending approval gating.
- Verifies generic start is blocked for a pending high-risk case and audited as `status.denied`.
- Creates the Chinese food-stall licensing case and verifies `needs_info`, missing fields and Business Licensing FAQ citation.
- Creates the English education/welfare case and verifies officer-review-only behavior, no generic closure and Welfare Education Aid Policy citation.
- Creates an unknown low-confidence case and verifies `manual_review`.
- Opens `/m`, `/officer`, `/officer/cases/[id]` and `/officer/audit` in Chromium and validates visible judge-facing UI text.

Latest result:

```text
npm run smoke:e2e
MAIC e2e smoke passed at http://127.0.0.1:3012
```

## MAIC Rule Alignment

The generated materials follow the current public MAIC pages checked on 2026-06-18:

- Application materials: pitch deck, project summary and AI disclosure are covered.
- Pitch deck: 12 slides.
- Project summary: under 500 words.
- AI disclosure: over 100 words.
- Language: English.
- Track: T5 - Public Services & Smart Cities.
- Boundary: no real citizen data, no production government claim, no track pivot.

## Remaining External Step

Before final submission, fill in and verify:

- Public artifact / repository URL with no login wall during judging windows.
- Demo video URL or MP4 upload location.
- Team member profiles and Malaysian Anchor information.

Do not mark hosted deployment complete until a public URL is actually configured and smoke-tested.
