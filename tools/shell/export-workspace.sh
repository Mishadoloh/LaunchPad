#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPORT_DIR="${LAUNCHPAD_EXPORT_DIR:-$ROOT_DIR/exports}"

cd "$ROOT_DIR"
export PYTHONPATH="$ROOT_DIR/tools/python${PYTHONPATH:+:$PYTHONPATH}"

if [[ -z "${LAUNCHPAD_TOKEN:-}" ]]; then
  echo "LAUNCHPAD_TOKEN is required for protected export endpoints." >&2
  echo "Run: python -m launchpad_ops.cli login admin@launchpad.dev launchpad123" >&2
  exit 1
fi

python -m launchpad_ops.cli \
  --export-dir "$EXPORT_DIR" \
  --token "$LAUNCHPAD_TOKEN" \
  export
