# Railway Portal Deploy Runbook

Status: config prepared only. Deployment was not executed because this session has no Railway CLI installed or authenticated host credentials.

## Host Decision

Recommended host: Railway.

Reason: CivicFlow uses an in-memory store, so it needs a long-running Node process instead of default serverless. Railway supports config-as-code through `railway.json`, can run the exact Next.js build/start commands, and does not require any demo environment variables. Render Free sleeps on idle, which can wipe in-memory demo state. Fly.io is pay-as-you-go rather than a true free account/free tier for new users.

No production-readiness claim is made. This is still a public hackathon demo with synthetic data.

## Config

The repository root includes `railway.json`:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start -- --hostname 0.0.0.0 --port $PORT",
    "healthcheckPath": "/",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

No environment variables are required. Leave `ANTHROPIC_API_KEY` unset for the deterministic/keyless demo path.

`POST /api/reset` is intentionally open for this synthetic demo so the hosted portal can be reset to seed data before judge review or smoke testing. Do not present that as production security posture.

## Deploy From GitHub

1. Open Railway and create a new project.
2. Choose GitHub deployment.
3. Select repository `jeffrey4341/civicflow-my-maic-demo`.
4. Select branch `chore/demo-submission-pack`.
5. Confirm the root directory is `/`.
6. Let Railway detect `railway.json`.
7. Confirm build command: `npm run build`.
8. Confirm start command: `npm run start -- --hostname 0.0.0.0 --port $PORT`.
9. Deploy the service.
10. In the service Networking settings, generate a public domain.
11. Open the generated URL in a private/incognito browser and confirm there is no login wall.

## Deploy From CLI

Run from this repository root after Railway login is available:

```powershell
git checkout chore/demo-submission-pack
git pull --ff-only origin chore/demo-submission-pack
npm install
npm run typecheck
npm test
npm run build
npm install -g @railway/cli
railway login
railway init
railway up --detach
```

Then generate a public domain in the Railway service Networking settings if the CLI output did not provide one.

## Live Verification

Set the hosted URL:

```powershell
$env:CIVICFLOW_BASE_URL = "https://YOUR-RAILWAY-DOMAIN"
```

Run the required smoke:

```powershell
npm run smoke:e2e
```

Expected result: `MAIC e2e smoke passed at https://YOUR-RAILWAY-DOMAIN` and 11 visible/API assertions pass.

Probe the required routes:

```powershell
$paths = @("/", "/m", "/officer", "/officer/approvals", "/officer/audit", "/api/cases", "/api/audit")
foreach ($path in $paths) {
  $res = Invoke-WebRequest -Uri "$env:CIVICFLOW_BASE_URL$path" -UseBasicParsing
  "$path $($res.StatusCode)"
}
```

Expected result: every route returns `200`.

Submit one flood-risk case and confirm approval/audit evidence:

```powershell
Invoke-RestMethod -Method Post -Uri "$env:CIVICFLOW_BASE_URL/api/reset"

$caseBody = @{
  text = "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."
  language = "ms"
  location_text = "Jalan Demo, Taman Demo"
  media_refs = @("photo:railway-demo.jpg")
} | ConvertTo-Json

$case = Invoke-RestMethod -Method Post -Uri "$env:CIVICFLOW_BASE_URL/api/cases" -ContentType "application/json" -Body $caseBody
$case | Select-Object case_id, citizen_ref, status, approval_task_id

$approvals = Invoke-RestMethod -Uri "$env:CIVICFLOW_BASE_URL/api/approvals?status=pending"
$approvals | Where-Object { $_.case_id -eq $case.case_id } | Select-Object id, case_id, status, reason

$audit = Invoke-RestMethod -Uri "$env:CIVICFLOW_BASE_URL/api/audit"
$audit | Where-Object { $_.case_id -eq $case.case_id } | Select-Object event_type, summary, actor_type
```

Expected result:

- the submitted case status is `awaiting_supervisor`;
- a pending approval exists for the submitted `case_id`;
- audit events exist for the submitted `case_id`.

## Docs Sync After Verified Deploy

Only after the live checks pass, add `docs/audit/portal_deploy_recheck_<date>.md` with:

- host: Railway;
- public URL;
- `npm run smoke:e2e` summary;
- route probe summary;
- flood-risk case approval/audit evidence;
- note that `POST /api/reset` is intentionally open for the self-healing synthetic demo.

Then add the live URL to the README Quick Start. Do not edit already-submitted materials.
