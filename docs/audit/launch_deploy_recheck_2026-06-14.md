# Launch / Deploy Recheck — 2026-06-14

## Verdict

**PASS for local production launch and deployable Next.js artifact.**

CivicFlow MY Mobile was verified as a single Next.js application where the frontend and backend API route handlers launch together from the production build output. The public cloud deployment step was not executed because this checkout has no `.vercel/project.json` project link and no `vercel` CLI on `PATH`; no external deployment target is configured in the repository.

## Environment

- Workspace: `E:\Administrator\Downloads\civicflow-my-maic-demo`
- Verified app-code base commit: `8630aab`
- Working-tree note: this verification report and the 3-minute script update were added after the app-code gates passed; no application code was changed in this recheck.
- Runtime path verified: `npm run build` then `npm run start -- --hostname 127.0.0.1 --port 3004`
- Port note: `3000` was already occupied, so the documented alternate port `3004` was used.
- Demo mode: deterministic/offline; no API key required.

## Gates Run

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 6 files, 29 tests |
| `npm audit --omit=dev --audit-level=moderate` | PASS — found 0 vulnerabilities |
| `npm run build` | PASS — Next.js 15.5.19 production build completed |
| Production server start | PASS — ready on `http://127.0.0.1:3004` |

## HTTP Smoke

| Endpoint | Result |
| --- | --- |
| `GET /m` | 200 |
| `GET /officer` | 200 |
| `GET /api/cases` | 200 |
| `GET /api/approvals` | 200 |
| `GET /api/audit` | 200 |
| `POST /api/reset` | 200 — `ok: true`, `seeded_cases: 6` |

## Rendered Demo Flow Smoke

Browser verification on `http://127.0.0.1:3004` showed no relevant console warnings or errors on the checked pages.

| Script path | Result |
| --- | --- |
| Malay blocked drain | PASS — detected Malay, classified drainage/flood-risk, routed to Engineering / Drainage Unit, cited Drainage Response SOP, status `awaiting_supervisor` before approval |
| Supervisor approval | PASS — decision note required, approval moved the case to `in_progress`, audit recorded `approval.approved` and status change |
| Chinese business licence | PASS — detected Chinese, routed to Licensing Unit, cited Business Licensing FAQ, status `needs_info`, missing location/business type/operating hours, Chinese reply draft present |
| English education aid | PASS — routed to Community & Welfare / Education Support Unit, cited Welfare Education Aid Policy, document checklist present, explicit no-auto-eligibility wording shown |
| Global audit | PASS — `/officer/audit` showed the new case refs plus language detection, classification, retrieval, routing, approval, reply draft, and status-change events |

## Launch Instructions

Use the production path for recording or deployment-style review:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

If `3000` is busy:

```bash
npm run start -- --hostname 127.0.0.1 --port 3004
```

Reset before each take:

```bash
npm run seed:reset
```

or:

```bash
curl -X POST http://127.0.0.1:3004/api/reset
```

Use the matching port for the running server.

## Deployment Boundary

The app is deployable as a standard Next.js app after `npm run build`. The backend is included through Next.js `/api` route handlers, so no separate backend process is required. An external Vercel or cloud deployment still needs a configured project link and credentials/token outside this repository.
