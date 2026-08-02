# CivicFlow MY Mobile — portal setup script (Windows server / local test)
#
# Usage (from anywhere):
#   powershell -ExecutionPolicy Bypass -File scripts\portal\setup_portal.ps1                 # install + build + serve on 0.0.0.0:3000 (foreground)
#   powershell -ExecutionPolicy Bypass -File scripts\portal\setup_portal.ps1 -Port 8080     # custom port
#   powershell -ExecutionPolicy Bypass -File scripts\portal\setup_portal.ps1 -Probe         # install + build + start temporarily, probe 7 routes, stop; exit 0/1
#   powershell -ExecutionPolicy Bypass -File scripts\portal\setup_portal.ps1 -SkipInstall   # reuse existing node_modules
#
# Keepalive on a Windows server (run at boot, restart on exit):
#   schtasks /Create /TN CivicFlowPortal /SC ONSTART /RU SYSTEM /TR ^
#     "powershell -ExecutionPolicy Bypass -File E:\path\to\repo\scripts\portal\setup_portal.ps1 -SkipInstall"
#   (or use NSSM to wrap this script as a service for automatic restart on crash)
#
# The demo is keyless and synthetic-data only; no env vars are required.

param(
  [int]$Port = 3000,
  [string]$BindHost = "0.0.0.0",
  [switch]$SkipInstall,
  [switch]$Probe
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

function Invoke-Step {
  param([string]$Label, [string]$Command)
  Write-Host "==> $Label"
  cmd /c $Command
  if ($LASTEXITCODE -ne 0) { throw "$Label failed (exit $LASTEXITCODE)" }
}

# Next.js 15 requires Node ^18.18 || >=20
$nodeRaw = (& node --version) 2>$null
if (-not $nodeRaw) { throw "Node.js not found on PATH. Install Node 18.18+ or 20+." }
$v = [version]($nodeRaw.TrimStart("v"))
if ($v.Major -lt 18 -or ($v.Major -eq 18 -and $v.Minor -lt 18) -or $v.Major -eq 19) {
  throw "Node $nodeRaw unsupported. Next.js 15 needs ^18.18 or >=20."
}
Write-Host "Node $nodeRaw OK"

if (-not $SkipInstall) { Invoke-Step "npm ci" "npm ci" }
Invoke-Step "npm run build" "npm run build"

$routes = @("/", "/m", "/officer", "/officer/approvals", "/officer/audit", "/api/cases", "/api/audit")

if ($Probe) {
  # Temporary loopback server: probe every demo route, then stop. Exit code reflects health.
  Write-Host "==> probe: starting temporary server on 127.0.0.1:$Port"
  $proc = Start-Process -FilePath cmd -ArgumentList "/c", "npm run start -- --hostname 127.0.0.1 --port $Port" -PassThru -WindowStyle Hidden
  try {
    $ready = $false
    foreach ($i in 1..30) {
      Start-Sleep -Seconds 2
      try {
        if ((Invoke-WebRequest -Uri "http://127.0.0.1:$Port/m" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { $ready = $true; break }
      } catch {}
    }
    if (-not $ready) { throw "server did not become ready on port $Port within 60s" }
    $failed = @()
    foreach ($r in $routes) {
      try {
        $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port$r" -UseBasicParsing -TimeoutSec 10).StatusCode
      } catch { $code = 0 }
      $mark = if ($code -eq 200) { "ok " } else { $failed += $r; "FAIL" }
      Write-Host ("  {0} {1,-22} {2}" -f $mark, $r, $code)
    }
    if ($failed.Count -gt 0) { throw "probe failed for: $($failed -join ', ')" }
    Write-Host "Portal probe passed: all $($routes.Count) routes returned 200."
  } finally {
    # taskkill kills the whole npm->node tree; Stop-Process would orphan the server.
    cmd /c "taskkill /pid $($proc.Id) /T /F" | Out-Null
  }
} else {
  Write-Host "==> serving on ${BindHost}:${Port} (Ctrl+C to stop)"
  cmd /c "npm run start -- --hostname $BindHost --port $Port"
  exit $LASTEXITCODE
}
