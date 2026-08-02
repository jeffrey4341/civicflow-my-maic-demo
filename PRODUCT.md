# PRODUCT.md — CivicFlow MY Mobile

> Derived from `README.md` and `AGENTS.md` (2026-07-02). Docs-only product context; not a redesign.

## What this is

A mobile-first, multilingual (ms/en/zh/ta) citizen-service casework demo for Malaysian local councils (PBT), built for the MAIC Nexus Challenge **T5 — Public Services & Smart Cities**. Citizens submit requests at `/m`; officers and supervisors triage, route, approve, and reply from `/officer`. AI drafts classifications, citations, routing, and replies; **humans make every consequential decision**.

## Register

`product` — the UI serves the workflow. Officer console is a dense, trust-first working tool; citizen `/m` is a simple mobile intake. Design must keep AI-draft vs human-decision visually unmistakable (draft labels, citations, approval states, audit timeline).

## Users

- **Citizen** (mobile, any of 4 languages): submit a request, see what is missing, read the drafted reply.
- **Officer**: triage queue, verify classification/citations, confirm or override routing, edit and send replies.
- **Supervisor**: approve or reject high-risk escalations in `/officer/approvals`.

## Hard boundaries (do not design/build against these)

- 100% synthetic data; public-demo safe; no real citizen data, NRIC, addresses, or SOPs.
- AI never closes cases, approves escalations, dispatches teams, or decides eligibility.
- Every recommendation cites a `PolicyCitation` or falls back to manual review; default-deny on ambiguity.
- Deterministic pipeline parity: demo runs fully offline with no `ANTHROPIC_API_KEY`.
- Not a chatbot; not a generic enterprise agent platform; no production-readiness claims.

## Stack

Single Next.js 15 App Router app (React 18, TypeScript, Tailwind). Backend = `/api` route handlers; in-memory store seeded from `data/seed` (`POST /api/reset`). Tests: Vitest. Smoke: `npm run smoke:e2e`.
