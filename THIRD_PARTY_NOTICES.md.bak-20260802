# Third-Party Notices

**CivicFlow MY Mobile** — MAIC Nexus Challenge T5 (Public Services & Smart Cities) public hackathon demo.

This document lists the third-party open-source dependencies used by this demo and their respective licences. CivicFlow MY Mobile is a single Next.js 15 (App Router) + React 18 + TypeScript application; the AI/RAG pipeline is deterministic TypeScript that runs fully offline with synthetic fixtures, with an optional Anthropic LLM path that is used only when an `ANTHROPIC_API_KEY` is configured.

The dependencies below are the building blocks that make the demo run. Each entry records the package name, its role in the project, and its licence (all are permissive: MIT or Apache-2.0).

## Licence summary

All third-party dependencies are distributed under the permissive **MIT** or **Apache-2.0** licences. No copyleft, no proprietary, and no source-available-restricted components are included.

## Runtime dependencies

These packages are required to build and run the demo application.

| Package | Role in project | Licence |
| --- | --- | --- |
| `next` | Next.js 15 framework — App Router pages, API route handlers under `/api`, server runtime | MIT |
| `react` | UI library — citizen mobile route `/m` and the officer console (`/officer`, `/officer/cases/[id]`, `/officer/approvals`, `/officer/audit`) | MIT |
| `react-dom` | React renderer for the browser DOM | MIT |

## Development and optional dependencies

These packages support building, type-checking, styling, and testing. They are not required at runtime in a production-style deployment.

| Package | Role in project | Licence |
| --- | --- | --- |
| `typescript` | Static typing for all application and pipeline code | Apache-2.0 |
| `tailwindcss` | Utility-first CSS framework for the mobile-first, multilingual UI | MIT |
| `postcss` | CSS transformation pipeline used by Tailwind | MIT |
| `autoprefixer` | PostCSS plugin that adds vendor prefixes for cross-browser CSS | MIT |
| `vitest` | Test runner for the deterministic AI/RAG pipeline and route handlers | MIT |
| `playwright` | Browser automation for the MAIC e2e smoke script (`npm run smoke:e2e`) | Apache-2.0 |
| `@types/node` | TypeScript type definitions for the Node.js runtime | MIT |
| `@types/react` | TypeScript type definitions for React | MIT |
| `@types/react-dom` | TypeScript type definitions for React DOM | MIT |

## Optional LLM path — no extra dependency

The optional Anthropic LLM path (`src/lib/llm.ts`) is exercised **only** when an
`ANTHROPIC_API_KEY` is present. It calls the Anthropic Messages HTTP API directly
using the runtime's built-in `fetch` — **no third-party SDK is bundled or
required**. When no key is configured, the deterministic TypeScript fallback
produces identical-shape structured output, so the demo runs end-to-end with the
dependencies listed above and nothing else.

## Notes

- **Licence ownership.** The full licence texts and copyright notices for each package belong to their respective projects and authors. Refer to each package's repository or its entry in `node_modules/<package>/LICENSE` for the authoritative licence text. The summaries above are provided for convenience and do not modify or supersede those licences.
- **No proprietary third-party code.** This demo adds no proprietary, closed-source, or source-available-restricted third-party code. It reuses only **architectural concepts** (role-aware workflow, RAG-with-citations, approval gates, append-only audit timeline, policy retrieval, model-draft + human-decision, deterministic fallback, synthetic demo data) from a private reference repository — no code, secrets, environment files, credentials, or enterprise modules were imported.
- **Synthetic data.** All seed content, policy documents, and demo cases are 100% synthetic. No real citizen data, NRIC, addresses, phone numbers, government SOPs, or private agency data are included.
- **Demo artifact.** This is a hackathon demonstration, not a production-ready system. AI **drafts** recommendations; officers and supervisors **decide**, and high-risk cases require human approval.
