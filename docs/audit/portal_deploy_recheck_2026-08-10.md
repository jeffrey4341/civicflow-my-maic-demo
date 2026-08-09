# Portal Deploy Recheck - 2026-08-10

## Verdict

PASS for the public MAIC T5 synthetic demo portal gate.

- Public URL: https://maic.aifather.dpdns.org
- Origin VM: `192.168.1.9` (`maictest`), with the Next.js origin bound only to `127.0.0.1:3013`.
- Runtime: one persistent Next.js production process, required because the demo store is in memory.
- Exposure: a dedicated remotely managed Cloudflare Tunnel named `civicflow-maic`; unrelated existing tunnels were not changed.
- Data boundary: synthetic demo data only. This is not a production-readiness claim.

`POST /api/reset` remains intentionally public for this synthetic demo so reviewers can restore the six seeded fixtures. Restarting the single Node process also resets the in-memory store.

## VM Runtime Evidence

Observed on the VM:

```text
hostname: maictest
Node: v24.19.0
npm: 11.17.0
cloudflared: 2026.7.3
civicflow-maic.service: active, enabled, MainPID 5202
cloudflared.service: active, enabled, MainPID 5341
origin listener: 127.0.0.1:3013
origin GET /: 200
origin POST /api/reset: {"ok":true,"seeded_cases":6}
```

The application is installed at `/opt/civicflow-my-maic-demo`. Both services are managed by systemd and start automatically after a VM reboot.

## Cloudflare Evidence

Cloudflare API reads returned HTTP 200 for the tunnel, configuration, and DNS record:

```text
Tunnel ID: ee8884fd-b876-4be8-aa39-d294932b37bb
Tunnel name: civicflow-maic
Tunnel status: healthy
Active connections: 4
Ingress: maic.aifather.dpdns.org -> http://127.0.0.1:3013
Fallback ingress: http_status:404
DNS: proxied CNAME maic.aifather.dpdns.org
Target: ee8884fd-b876-4be8-aa39-d294932b37bb.cfargotunnel.com
TTL: automatic
```

Public DNS resolved to Cloudflare edge addresses `172.67.173.96` and `104.21.63.245` during the verification run.

## Public Route Probes

Command shape:

```powershell
$base = "https://maic.aifather.dpdns.org"
foreach ($path in @("/", "/m", "/officer", "/officer/approvals", "/officer/audit", "/api/cases", "/api/audit")) {
  (Invoke-WebRequest -Uri "$base$path" -UseBasicParsing -TimeoutSec 30).StatusCode
}
Invoke-RestMethod -Method Post -Uri "$base/api/reset"
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
POST /api/reset 200: {"ok":true,"seeded_cases":6}
```

## Hosted Browser Smoke

Command:

```powershell
cmd /c "set CIVICFLOW_BASE_URL=https://maic.aifather.dpdns.org&& npm run smoke:e2e"
```

Final result: exit `0`.

```text
MAIC e2e smoke passed: 4 canonical cases, closure and immutability gates,
and 10 rendered views at https://maic.aifather.dpdns.org
```

The first two hosted runs correctly exposed a harness-only incompatibility: Cloudflare Browser Insights aborted its best-effort `POST /cdn-cgi/rum` beacon during navigation. The shared browser watcher now ignores only that exact path/method when the failure is exactly `net::ERR_ABORTED`; other paths, methods, and error types remain failures. Focused helper tests passed `3/3` before the hosted smoke was rerun.

## Dependency Gate

The initial production audit found vulnerable transitive `nanoid` and pinned `postcss` versions. `postcss` was updated from `8.5.18` to `8.5.26`, resolving `nanoid` to `3.3.18` without changing the application framework or product behavior.

```powershell
npm audit --omit=dev --audit-level=moderate
```

Observed result: `found 0 vulnerabilities` (exit `0`). A full all-dependencies audit still reports development-only advisories in the existing Vitest/Vite toolchain; it is outside the production audit gate and was not force-upgraded.

## Final Repository Gates

Fresh final-state results:

```text
node --test scripts/smoke/helpers.test.mjs: 3/3 passed, exit 0
npm run typecheck: exit 0
npm test: 10/10 files and 76/76 tests passed, exit 0
npm run build: Next.js 15.5.22 production build, exit 0
npm run smoke:citizen: Citizen UI smoke passed, exit 0
npm run smoke:officer: Officer UI smoke passed, exit 0
npm audit --omit=dev --audit-level=moderate: found 0 vulnerabilities, exit 0
hosted npm run smoke:e2e: 4 canonical cases and 10 rendered views, exit 0
```

The final hosted run produced ten screenshots. The role launcher, officer queue, Chinese citizen reply, and audit trail were visually inspected with no blocking overlap or missing-content issue observed.

## Operational Boundary

- Keep `civicflow-maic.service` and `cloudflared.service` active for the URL to remain available.
- The origin port is loopback-only; inbound public traffic enters through Cloudflare Tunnel.
- The demo has no login wall and contains no real citizen or government data.
- AI outputs remain drafts and recommendations; officer/supervisor decisions and the approval guardrails remain unchanged.
