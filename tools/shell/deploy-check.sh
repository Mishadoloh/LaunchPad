#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_URL="${LAUNCHPAD_API_URL:-http://localhost:4200/api}"
WEB_URL="${LAUNCHPAD_WEB_URL:-http://localhost:5174}"

cd "$ROOT_DIR"
export PYTHONPATH="$ROOT_DIR/tools/python${PYTHONPATH:+:$PYTHONPATH}"

echo "Checking TypeScript workspaces"
npm run typecheck

echo "Building shared package"
npm run build -w @launchpad/shared

echo "Building frontend demo"
VITE_DEMO_MODE=true VITE_BASE_PATH=/LaunchPad/ npm run build -w @launchpad/web

echo "Checking service URLs"
python -m launchpad_ops.cli \
  --api-url "$API_URL" \
  --web-url "$WEB_URL" \
  health
