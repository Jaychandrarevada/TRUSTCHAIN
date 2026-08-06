#!/usr/bin/env bash
# Newman runner (PART 5). Requires a running backend on the env base_url.
#   npm i -g newman newman-reporter-htmlextra
#   qa/postman/newman-run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$HERE/../reports/api"

newman run "$HERE/TrustChain.postman_collection.json" \
  --environment "$HERE/environments/local.postman_environment.json" \
  --reporters cli,json,htmlextra \
  --reporter-json-export "$HERE/../reports/api/newman.json" \
  --reporter-htmlextra-export "$HERE/../reports/api/newman.html" \
  --color on

# Newman exits non-zero on any failed assertion → CI gate.
echo "Newman run complete → qa/reports/api/newman.html"
