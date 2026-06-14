# Dependency Security Fix Report

## Verdict

Audit clean

## Changes Made

- Attempted `npm audit fix` without `--force`; it did not resolve the production audit.
- Upgraded `next` from `14.2.35` to `15.5.19`, the minimal stable major that resolves the Next production advisories while retaining React 18 peer compatibility.
- Upgraded `postcss` from `8.4.39` to `8.5.15`.
- Added npm override:

```json
{
  "overrides": {
    "postcss": "8.5.15"
  }
}
```

- Updated `package-lock.json` through `npm install`.
- Applied the required Next 15 App Router migration for dynamic route `params` promises in API routes and pages.
- Updated direct route-handler tests to pass `params` as a resolved promise.
- Updated `docs/audit/dependency_risk_note.md` so the previous risk note no longer reports a stale production audit failure.
- Verified `.gitignore` excludes `node_modules/`, `.next/`, `.claude/`, `*.tsbuildinfo`, `.env`, and `*.log`.

Investigation summary:

- Node: `v24.14.0`
- npm: `11.6.2`
- Latest `next`: `16.2.9`
- Latest `postcss`: `8.5.15`
- No patched `next@14.x` is available; `14.2.35` is the latest Next 14 release.
- `next@15.5.19` supports `react@18.3.1` and `react-dom@18.3.1`.
- `postcss` can be resolved with npm overrides; `npm ls next postcss react react-dom --depth=2` shows `postcss@8.5.15` deduped under `next`.

Git hygiene note:

```text
Git repository initialization and final tracked-file hygiene are covered by docs/audit/final_submission_packaging_check.md.
```

The ignore file is configured to exclude generated build folders and local environment files.

## Audit Result

Command:

```powershell
npm audit --omit=dev --audit-level=moderate
```

Result:

```text
found 0 vulnerabilities
```

## Verification Commands

- `npm run typecheck` - passed.
- `npm test` - passed, 6 test files and 29 tests.
- `npm run build` - passed on Next `15.5.19`.
- `npm run lint` - passed.
- `npm audit --omit=dev --audit-level=moderate` - passed, `found 0 vulnerabilities`.
- Production server smoke on `http://127.0.0.1:3003` - passed.

Production smoke coverage:

- `/m` returned 200 and rendered in the in-app browser with no runtime or console errors.
- `/officer` returned 200 and rendered in the in-app browser with no runtime or console errors.
- Malay blocked-drain high-risk path created an `awaiting_supervisor` drainage case, blocked `in_progress` before approval with `Supervisor approval required before work can start.`, then allowed supervisor approval.
- Chinese licensing seeded path `CF-LIC001` remained `needs_info` with `location`, `business_type`, and `operating_hours` missing.
- English education/welfare seeded path `CF-EDU001` remained routed for officer review, with no automatic eligibility approval.
- Unknown fallback path created `manual_review` with the reason `Manual review required because no reliable policy citation was found.`

## Remaining Risks

- `npm audit` without `--omit=dev` still reports dev-only Vite/esbuild/Vitest advisories. The requested production audit gate is clean; address dev dependencies separately if a full all-dependencies audit gate becomes required.
- The migration touched framework compatibility only. Product scope, UI design, civic workflow, approval gates, RAG behavior, audit behavior, and case logic were not redesigned.
- This remains a public-demo, synthetic-data artifact with no production deployment claim.
- Full Git hygiene is covered by the final submission packaging check.

## Recommendation

The repo is ready for final demo recording and public artifact submission from the production dependency security gate standpoint. Keep the existing synthetic-data and no-production-claim boundaries for the submission artifact.
