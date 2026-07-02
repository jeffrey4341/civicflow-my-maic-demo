# Product Roadmap Update - 2026-06-18

## Verdict

**Roadmap updated for real product value while preserving the current demo boundary.**

The roadmap now describes CivicFlow as a future governed integration layer for Malaysian public-service operators. It explicitly covers how the product would connect to each agency's existing apps, databases, case-management systems, work-order tools, GIS / asset data, notification channels, SSO and approved SOP repositories.

## Files Updated

- `docs/roadmap/product_roadmap.md` - new full product roadmap.
- `README.md` - added a short public-facing roadmap section.
- `docs/submission/maic_submission_materials_2026-06-18.md` - added judge-facing roadmap positioning.
- `scripts/submission/generate_maic_submission_pdfs.py` - updated the pitch PDF roadmap slide.
- `output/pdf/civicflow-my-mobile-maic-pitch.pdf` - regenerated with the updated roadmap slide.
- `output/pdf/previews/` - regenerated PDF page previews and contact sheets.

## Roadmap Improvements

The previous roadmap was a short "Next 90 days" list. The new roadmap is staged as:

- Current hackathon artifact: synthetic public-service workflow demo.
- 0-90 days: hosted pilot environment, persistent agency-tenanted database, auth boundary, SOP onboarding and compliance gate.
- 3-6 months: first agency pilot with case-management, work-order, GIS / asset, notification, SOP/document and SSO adapters.
- 6-12 months: multi-agency tenancy, connector registry, policy source governance, multilingual service-equity audit and production RAG governance.
- 12-18 months: PDPA-aligned privacy controls, security hardening, model governance, rollout playbook and commercial packaging.

## Boundary Preserved

The roadmap does **not** claim that real government integrations already exist. It states that the current repository remains a synthetic demo and that real agency systems, real SOPs, real citizen data and production certification are future work only after appropriate approvals.

## PDF Check

The pitch PDF was regenerated through `scripts/submission/generate_maic_submission_pdfs.py`. The updated slide 12 was rendered and visually inspected from:

- `output/pdf/previews/civicflow-my-mobile-maic-pitch-p12.png`
- `output/pdf/previews/civicflow-my-mobile-maic-pitch-contact-sheet.png`

No visible text overlap, clipping or blank slide was observed in the updated roadmap slide.
