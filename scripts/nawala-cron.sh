#!/usr/bin/env bash
# Nawala (Trust Positif) cron script. Run from cron so curl uses VPN (works when
# in-app curl fails). Fetches used domains from main-api, queries Trust Positif,
# then POSTs results to main-api. Deploy with main-api via git; run from crontab.
#
# Env (set in crontab or when running):
#   NAWALA_CRON_API_URL  (optional) - main-api base URL (default http://127.0.0.1)
#   TRUST_POSITIF_BASE   (optional) - Trust Positif URL (default https://182.23.79.198)
#   TRUST_POSITIF_HOST   (optional) - Host header (default trustpositif.komdigi.go.id)
#
# Example crontab (every 6 hours):
#   0 */6 * * * /var/app/main-api/scripts/nawala-cron.sh >> /var/log/nawala-cron.log 2>&1

set -e
API_URL="${NAWALA_CRON_API_URL:-http://127.0.0.1}"
TP_BASE="${TRUST_POSITIF_BASE:-https://182.23.79.198}"
TP_HOST="${TRUST_POSITIF_HOST:-trustpositif.komdigi.go.id}"
COOKIE_FILE="${TMPDIR:-/tmp}/trustpositif-cookies-cron-$$.txt"
BATCH_SIZE=50

DOMAINS_JSON=$(curl -sS "${API_URL}/api/domains/nawala-cron" || true)
if [ -z "$DOMAINS_JSON" ]; then
  echo "Failed to fetch domains or 404"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install with: apt-get install -y jq"
  exit 1
fi

if ! echo "$DOMAINS_JSON" | jq -e '.domains' >/dev/null 2>&1; then
  echo "Invalid response or 404 (check API URL and that main-api is running)"
  exit 1
fi

DOMAINS=$(echo "$DOMAINS_JSON" | jq -r '.domains[]?' 2>/dev/null | tr '\n' ' ')
DOMAINS_ARR=()
for d in $DOMAINS; do
  [ -n "$d" ] && DOMAINS_ARR+=("$d")
done

if [ ${#DOMAINS_ARR[@]} -eq 0 ]; then
  echo "NAWALA_APPLY_RESULT={\"checked\":0,\"updated\":0}"
  echo "No used domains to check"
  exit 0
fi

cleanup() { [ -f "$COOKIE_FILE" ] && rm -f "$COOKIE_FILE"; }
trap cleanup EXIT

PAGE=$(curl -sS -k -4 --connect-timeout 30 -H "Host: $TP_HOST" -c "$COOKIE_FILE" "${TP_BASE}/" 2>&1) || true
if [ -z "$PAGE" ] || ! echo "$PAGE" | grep -q csrf_token; then
  echo "Trust Positif GET failed or no CSRF on page"
  exit 1
fi

CSRF=$(echo "$PAGE" | sed -n 's/.*name="csrf_token"[^>]*value="\([^"]*\)".*/\1/p' | head -1)
if [ -z "$CSRF" ]; then
  CSRF=$(echo "$PAGE" | sed -n 's/.*value="\([^"]*\)"[^>]*name="csrf_token".*/\1/p' | head -1)
fi
if [ -z "$CSRF" ]; then
  echo "Could not extract CSRF token"
  exit 1
fi

RESULTS="[]"
TOTAL=0
BLOCKED_VALUES="ada blocked terblokir yes 1"

for (( i=0; i < ${#DOMAINS_ARR[@]}; i += BATCH_SIZE )); do
  BATCH=("${DOMAINS_ARR[@]:i:BATCH_SIZE}")
  NAMES=$(IFS=$'\n'; echo "${BATCH[*]}")
  BODY="csrf_token=$(printf '%s' "$CSRF" | jq -sRr @uri)&name=$(printf '%s' "$NAMES" | jq -sRr @uri)"

  POST_RESP=$(curl -sS -k -4 --connect-timeout 30 -H "Host: $TP_HOST" -b "$COOKIE_FILE" \
    -X POST -H "Content-Type: application/x-www-form-urlencoded" \
    --data-raw "$BODY" "${TP_BASE}/Rest_server/getrecordsname_home" 2>&1) || true

  if ! echo "$POST_RESP" | jq -e '.values' >/dev/null 2>&1; then
    echo "Trust Positif POST batch failed or invalid JSON"
    exit 1
  fi

  BATCH_ARR=$(echo "$POST_RESP" | jq -c --arg blocked "$BLOCKED_VALUES" '
    [ .values[] | {
      domain: (.Domain // .domain // "" | tostring),
      blocked: ((.Status // .status // "" | tostring | ascii_downcase) as $s |
        ($blocked | split(" ") | index($s)) != null)
    } ]
  ')
  RESULTS=$(echo "$RESULTS" | jq -c --argjson batch "$BATCH_ARR" '. + $batch')
  TOTAL=$((TOTAL + ${#BATCH[@]}))
done

PAYLOAD=$(jq -n -c --argjson results "$RESULTS" '{ results: $results }')
HTTP=$(curl -sS -w '%{http_code}' -o /tmp/nawala-apply-$$.out -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" "${API_URL}/api/domains/nawala-apply" 2>&1)
BODY=$(cat /tmp/nawala-apply-$$.out 2>/dev/null)
rm -f /tmp/nawala-apply-$$.out

if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "nawala-apply returned HTTP $HTTP"
  echo "$BODY"
  exit 1
fi

echo "NAWALA_APPLY_RESULT=$BODY"
echo "$(date -Iseconds) Nawala cron: checked $TOTAL domains, apply response: $BODY"
