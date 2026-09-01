#!/usr/bin/env bash
# Start Vetty's local API and frontend together.
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_pid=""
api_port="${VETTY_API_PORT:-5000}"
frontend_port="${VETTY_FRONTEND_PORT:-5173}"

cleanup() {
  if [[ -n "$api_pid" ]]; then
    kill "$api_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

cd "$project_dir/backend"
.venv/bin/python seed.py
.venv/bin/flask --app vetty_api run --host 127.0.0.1 --port "$api_port" --no-debugger --no-reload &
api_pid=$!

cd "$project_dir/Frontend"
VITE_API_PROXY_TARGET="http://127.0.0.1:$api_port" \
  npm run dev:vite -- --host 127.0.0.1 --port "$frontend_port" --strictPort
