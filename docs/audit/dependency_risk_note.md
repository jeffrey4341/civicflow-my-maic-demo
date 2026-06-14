# Dependency Risk Note

Date: 2026-06-14

Status: resolved for the production dependency audit gate.

`npm audit --omit=dev --audit-level=moderate` now reports:

```text
found 0 vulnerabilities
```

Resolution applied:

- `next` was upgraded from `14.2.35` to `15.5.19`.
- `postcss` was upgraded to `8.5.15`.
- `package.json` now pins an npm `overrides.postcss` entry at `8.5.15`, which dedupes the nested `postcss` copy used by `next`.

Why this was the safe path:

- `npm audit fix` without `--force` did not clear the production audit.
- There is no patched `next@14.x` version available; `14.2.35` is the latest Next 14 release.
- `next@15.5.19` is a stable patched release and keeps React 18 peer compatibility.
- The code migration was limited to the Next 15 App Router dynamic `params` promise signature.

Current verification context:

- The demo is a local/public-submission artifact, not a production deployment.
- No real citizen data, secrets, government SOPs, NRICs, phone numbers, or external production APIs are included.
- Typecheck, tests, production build, lint, production audit, and production smoke checks passed after the dependency update.

Recommended follow-up before production-style hosting:

1. Re-run the full verification suite on the intended hosting runtime.
2. Address dev-only Vite/esbuild/Vitest advisories if a full all-dependencies audit gate is required.
3. Continue to keep the demo synthetic-data only unless a separate production security plan is created.
