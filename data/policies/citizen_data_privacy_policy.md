# Citizen Data Privacy Policy

**Document type:** Privacy Policy (SYNTHETIC — demo only)
**Owner:** Data Protection Office
**Reference:** PRV-DAT-004 (fictional)

> A fictional, demo-level privacy policy inspired by the spirit of Malaysia's
> Personal Data Protection Act (PDPA). This is not legal advice.

## Data Minimisation

The system collects only what is needed to handle a case: the request text, the
chosen language, an approximate location, and optional mock attachments. The
demo does **not** request full NRIC, bank details, or real phone numbers.
Keywords: privacy, PDPA, personal data, NRIC, masking, consent, retention,
pii, perlindungan data.

## PII Handling and Masking

Each case carries a **PII-risk** label (low / medium / high). Text that appears
to contain identity numbers or contact details is flagged so officers handle it
carefully. In synthetic seed data, identity numbers are masked as
`XXXXXX-XX-XXXX` and phone numbers are never real.

## Purpose Limitation

Personal information is used only to deliver the requested council service and to
maintain an audit record. It is not used for marketing or profiling.

## Human Oversight and Transparency

Citizens are told that AI drafts recommendations and that officers decide.
High-risk decisions require supervisor approval. Every action is recorded in an
append-only audit timeline that an officer can review.

## Retention (Demo)

Demo data is held in memory and re-seeded on reset; it is not a system of record.
A production deployment would define a lawful retention schedule.

## Citizen Rights (Demo)

Citizens may ask what data is held about a case and request correction. The demo
records such requests in the audit timeline but does not implement full data
subject access.
