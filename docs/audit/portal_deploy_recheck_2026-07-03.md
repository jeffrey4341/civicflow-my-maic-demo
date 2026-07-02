# Portal Deploy Recheck - 2026-07-03

## Verdict

PASS for the public MAIC T5 demo portal gate.

- Host path: owner VM running a single local Next.js production process, exposed through a Cloudflare quick tunnel.
- Public URL: https://variety-circles-checks-slip.trycloudflare.com
- Login wall: none observed.
- Data boundary: synthetic demo data only.
- Governance boundary: AI drafts/recommends; officers and supervisors decide.
- Production-readiness claim: none. This is a public hackathon demo portal.

Cloudflare quick tunnels are accountless and do not provide an uptime guarantee. Keep the local Next.js and `cloudflared` processes running for the portal to stay reachable.

## Runtime Shape

- Local production origin: `http://127.0.0.1:3013`
- Build command: `npm run build`
- Start command: `npm run start -- --hostname 127.0.0.1 --port 3013`
- Tunnel command: `cloudflared tunnel --url http://127.0.0.1:3013 --no-autoupdate`
- No environment variables were set. `ANTHROPIC_API_KEY` remained unset, so the deterministic/keyless path was used.

`POST /api/reset` is intentionally open for this synthetic public demo. It is the self-healing reset path used before judging or smoke runs to restore seeded fixture data; it is not a production security posture.

## Build Evidence

Command:

```powershell
npm run build
```

Result:

- Next.js `15.5.19`
- Production build completed successfully.
- Routes built include `/`, `/m`, `/officer`, `/officer/approvals`, `/officer/audit`, `/api/cases`, `/api/audit`, and `/api/reset`.

## Public Route Probes

Command:

```powershell
$url = "https://variety-circles-checks-slip.trycloudflare.com"
foreach ($p in @("/", "/m", "/officer", "/officer/approvals", "/officer/audit", "/api/cases", "/api/audit")) {
  $res = Invoke-WebRequest -Uri "$url$p" -UseBasicParsing -TimeoutSec 20
  "$p $($res.StatusCode)"
}
```

Observed result:

```text
/ 200
/m 200
/officer 200
/officer/approvals 200
/officer/audit 200
/api/cases 200
/api/audit 200
```

Reset probe:

```powershell
Invoke-RestMethod -Method Post -Uri "https://variety-circles-checks-slip.trycloudflare.com/api/reset"
```

Observed result:

```json
{
  "ok": true,
  "seeded_cases": 6
}
```

## Hosted Smoke Evidence

Command:

```powershell
$env:CIVICFLOW_BASE_URL = "https://variety-circles-checks-slip.trycloudflare.com"
npm run smoke:e2e
```

Observed result:

```text
ok: citizen mobile route renders
ok: officer queue renders
ok: drainage case visible in queue
ok: approval blocker visible
ok: drainage citation visible
ok: needs-info blocker visible
ok: licensing citation visible
ok: welfare officer-review action visible
ok: welfare citation visible
ok: audit route renders
ok: denied transition audit visible
MAIC e2e smoke passed at https://variety-circles-checks-slip.trycloudflare.com
```

Summary: 11/11 smoke assertions passed against the hosted public URL.

## Flood-Risk Case Proof

Command summary:

```powershell
$base = "https://variety-circles-checks-slip.trycloudflare.com"
Invoke-RestMethod -Method Post -Uri "$base/api/reset"

$caseBody = @{
  text = "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat."
  language = "ms"
  location_text = "Jalan Demo, Taman Demo"
  media_refs = @("photo:portal-recheck.jpg")
} | ConvertTo-Json

$case = Invoke-RestMethod -Method Post -Uri "$base/api/cases" -ContentType "application/json" -Body $caseBody
$approvals = Invoke-RestMethod -Uri "$base/api/approvals?status=pending"
$audit = Invoke-RestMethod -Uri "$base/api/audit"
```

Observed result:

```json
{
  "reset_ok": true,
  "case_id": "case_00e04ca769d5",
  "citizen_ref": "CF-SN9Y4F",
  "case_status": "awaiting_supervisor",
  "approval_task_id": "appr_e4549ec988e7",
  "pending_approval_found": true,
  "approval_status": "pending",
  "audit_event_count": 10,
  "audit_event_types": "case.created,ai.language_detected,ai.classified,rag.retrieved,ai.routed,ai.missing_info,approval.requested,reply.drafted,approval.created,status.changed"
}
```

Conclusion: the hosted instance supports the required stateful path: submit flood-risk case -> pending supervisor approval visible -> audit events recorded.
