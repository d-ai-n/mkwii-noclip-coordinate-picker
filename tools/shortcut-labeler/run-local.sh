#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
labeler_root="$repo_root/tools/shortcut-labeler"
renderer_pid=""
labeler_pid=""

cleanup() {
  test -z "$labeler_pid" || kill "$labeler_pid" 2>/dev/null || true
  test -z "$renderer_pid" || kill "$renderer_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$repo_root"
./node_modules/.bin/rsbuild dev --host 127.0.0.1 --port 18089 &
renderer_pid=$!

for _ in $(seq 1 60); do
  if curl --fail --silent --output /dev/null http://127.0.0.1:18089/; then
    break
  fi
  sleep 1
done
curl --fail --silent --output /dev/null http://127.0.0.1:18089/

cd "$labeler_root"
python3 server.py --port 18088 &
labeler_pid=$!
wait "$labeler_pid"
