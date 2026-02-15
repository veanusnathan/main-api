#!/usr/bin/env bash
# Test Nawala check endpoint with curl.
# Requires: BASE_URL (e.g. http://localhost:3000), and either ACCESS_TOKEN or (USERNAME + PASSWORD) to login.

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"
# NestJS app uses setGlobalPrefix('api')
API_BASE="${BASE_URL}/api"

if [ -z "${ACCESS_TOKEN:-}" ]; then
  if [ -z "${USERNAME:-}" ] || [ -z "${PASSWORD:-}" ]; then
    echo "Set either ACCESS_TOKEN or both USERNAME and PASSWORD."
    echo "Example:"
    echo "  export BASE_URL=http://localhost:3000"
    echo "  export USERNAME=admin"
    echo "  export PASSWORD=yourpassword"
    echo "  ./scripts/test-nawala-curl.sh"
    echo "Or:"
    echo "  export ACCESS_TOKEN=your_jwt_access_token"
    echo "  ./scripts/test-nawala-curl.sh"
    exit 1
  fi
  echo "Logging in to get token..."
  RESP=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
  ACCESS_TOKEN=$(echo "$RESP" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  if [ -z "$ACCESS_TOKEN" ]; then
    echo "Login failed. Response: $RESP"
    exit 1
  fi
  echo "Got access token."
fi

echo "Calling POST ${API_BASE}/domains/refresh-nawala ..."
HTTP=$(curl -s -w "%{http_code}" -o /tmp/nawala-response.json -X POST "${API_BASE}/domains/refresh-nawala" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Accept: application/json")

echo "HTTP status: $HTTP"
echo "Response body:"
cat /tmp/nawala-response.json | head -c 500
echo ""

if [ "$HTTP" -eq 200 ]; then
  CHECKED=$(sed -n 's/.*"checked":\([0-9]*\).*/\1/p' /tmp/nawala-response.json)
  UPDATED=$(sed -n 's/.*"updated":\([0-9]*\).*/\1/p' /tmp/nawala-response.json)
  echo "Nawala check OK: checked=$CHECKED, updated=$UPDATED"
  exit 0
else
  echo "Request failed (expected 200)."
  exit 1
fi
