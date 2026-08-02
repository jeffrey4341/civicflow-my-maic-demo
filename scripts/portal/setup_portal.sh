#!/usr/bin/env bash
# CivicFlow MY Mobile — portal setup script (Linux server / local test)
#
# Usage (from anywhere):
#   bash scripts/portal/setup_portal.sh                    # install + build + serve on 0.0.0.0:3000 (foreground)
#   bash scripts/portal/setup_portal.sh --port 8080        # custom port
#   bash scripts/portal/setup_portal.sh --probe            # install + build + start temporarily, probe 7 routes, stop; exit 0/1
#   bash scripts/portal/setup_portal.sh --skip-install     # reuse existing node_modules
#
# Keepalive on a Linux server — systemd unit example (/etc/systemd/system/civicflow-portal.service):
#   [Unit]
#   Description=CivicFlow MY public demo portal
#   After=network.target
#   [Service]
#   WorkingDirectory=/opt/civicflow-my-maic-demo
#   ExecStart=/usr/bin/bash scripts/portal/setup_portal.sh --skip-install
#   Restart=always
#   RestartSec=5
#   [Install]
#   WantedBy=multi-user.target
# then: systemctl daemon-reload && systemctl enable --now civicflow-portal
#
# The demo is keyless and synthetic-data only; no env vars are required.

set -euo pipefail

PORT=3000
BIND_HOST=0.0.0.0
SKIP_INSTALL=0
PROBE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --host) BIND_HOST="$2"; shift 2 ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --probe) PROBE=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/../.."

# Next.js 15 requires Node ^18.18 || >=20
NODE_VER="$(node --version 2>/dev/null | sed 's/^v//')" || { echo "Node.js not found. Install Node 18.18+ or 20+." >&2; exit 1; }
MAJOR="${NODE_VER%%.*}"; REST="${NODE_VER#*.}"; MINOR="${REST%%.*}"
if [[ "$MAJOR" -lt 18 || ( "$MAJOR" -eq 18 && "$MINOR" -lt 18 ) || "$MAJOR" -eq 19 ]]; then
  echo "Node v$NODE_VER unsupported. Next.js 15 needs ^18.18 or >=20." >&2; exit 1
fi
echo "Node v$NODE_VER OK"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then echo "==> npm ci"; npm ci; fi
echo "==> npm run build"; npm run build

ROUTES=(/ /m /officer /officer/approvals /officer/audit /api/cases /api/audit)

if [[ "$PROBE" -eq 1 ]]; then
  echo "==> probe: starting temporary server on 127.0.0.1:$PORT"
  npm run start -- --hostname 127.0.0.1 --port "$PORT" &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true' EXIT
  READY=0
  for _ in $(seq 1 30); do
    sleep 2
    if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/m"; then READY=1; break; fi
  done
  [[ "$READY" -eq 1 ]] || { echo "server did not become ready within 60s" >&2; exit 1; }
  FAILED=()
  for r in "${ROUTES[@]}"; do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$r" || echo 000)"
    if [[ "$CODE" == "200" ]]; then printf '  ok   %-22s %s\n' "$r" "$CODE"; else printf '  FAIL %-22s %s\n' "$r" "$CODE"; FAILED+=("$r"); fi
  done
  [[ "${#FAILED[@]}" -eq 0 ]] || { echo "probe failed for: ${FAILED[*]}" >&2; exit 1; }
  echo "Portal probe passed: all ${#ROUTES[@]} routes returned 200."
else
  echo "==> serving on $BIND_HOST:$PORT (Ctrl+C to stop)"
  exec npm run start -- --hostname "$BIND_HOST" --port "$PORT"
fi
