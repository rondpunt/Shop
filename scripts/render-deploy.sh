#!/usr/bin/env bash
# Deploy Shop&Go Kortrijk to Render via the public API.
#
# Prerequisites:
#   - Render API key: https://dashboard.render.com/u/settings#api-keys
#   - GitHub repo connected in Render (first deploy may require dashboard OAuth)
#
# Usage:
#   export RENDER_API_KEY='rnd_...'
#   # optional if you have multiple workspaces:
#   export RENDER_OWNER_ID='tea-...'   # from dashboard workspace settings
#   # optional secrets file (git-ignored pattern — do not commit):
#   export RENDER_ENV_FILE='.env.render'
#   ./scripts/render-deploy.sh
#
# The script creates the web service if missing, merges env vars, triggers a deploy,
# waits for live, and checks /api/shopgo-spots.

set -euo pipefail

API_BASE="${RENDER_API_BASE:-https://api.render.com/v1}"
SERVICE_NAME="${RENDER_SERVICE_NAME:-shopgo-kortrijk}"
REPO_URL="${RENDER_REPO_URL:-https://github.com/rondpunt/Shop}"
BRANCH="${RENDER_BRANCH:-cursor/setup-dev-environment-deee}"
BUILD_CMD='npm ci --include=dev && npm run build:legacy'
START_CMD='npm run start:legacy'
HEALTH_PATH='/api/shopgo-spots'
REGION='frankfurt'
PLAN='free'

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: Set RENDER_API_KEY (Render dashboard → Account Settings → API Keys)." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required." >&2
  exit 1
fi

if [[ -n "${RENDER_ENV_FILE:-}" && -f "$RENDER_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$RENDER_ENV_FILE"
  set +a
fi

api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${API_BASE}${path}" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "${API_BASE}${path}" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" \
      -H "Accept: application/json"
  fi
}

resolve_owner_id() {
  if [[ -n "${RENDER_OWNER_ID:-}" ]]; then
    echo "$RENDER_OWNER_ID"
    return
  fi
  local owners
  owners="$(api GET "/owners")"
  local count
  count="$(echo "$owners" | jq 'length')"
  if [[ "$count" -eq 0 ]]; then
    echo "ERROR: No Render workspaces found for this API key." >&2
    exit 1
  fi
  if [[ "$count" -gt 1 ]]; then
    echo "Multiple workspaces found; set RENDER_OWNER_ID to one of:" >&2
    echo "$owners" | jq -r '.[] | "\(.owner.id)  \(.owner.name)"' >&2
    exit 1
  fi
  echo "$owners" | jq -r '.[0].owner.id'
}

find_service_id() {
  local owner_id="$1"
  api GET "/services?ownerId=${owner_id}" | jq -r --arg name "$SERVICE_NAME" '
    [.[] | select(.service.name == $name) | .service.id][0] // empty'
}

create_service() {
  local owner_id="$1"
  local payload
  payload="$(jq -n \
    --arg type "web_service" \
    --arg name "$SERVICE_NAME" \
    --arg ownerId "$owner_id" \
    --arg repo "$REPO_URL" \
    --arg branch "$BRANCH" \
    --arg build "$BUILD_CMD" \
    --arg start "$START_CMD" \
    --arg health "$HEALTH_PATH" \
    --arg region "$REGION" \
    --arg plan "$PLAN" \
    '{
      type: $type,
      name: $name,
      ownerId: $ownerId,
      repo: $repo,
      branch: $branch,
      autoDeploy: "no",
      serviceDetails: {
        runtime: "node",
        plan: $plan,
        region: $region,
        healthCheckPath: $health,
        envSpecificDetails: {
          buildCommand: $build,
          startCommand: $start
        }
      }
    }')"
  api POST "/services" "$payload"
}

upsert_env_var() {
  local service_id="$1"
  local key="$2"
  local value="$3"
  api PUT "/services/${service_id}/env-vars/${key}" "$(jq -n --arg v "$value" '{value: $v}')"
}

trigger_deploy() {
  local service_id="$1"
  api POST "/services/${service_id}/deploys" '{}'
}

wait_for_deploy() {
  local service_id="$1"
  local deploy_id="$2"
  local status=""
  for _ in $(seq 1 90); do
    status="$(api GET "/services/${service_id}/deploys/${deploy_id}" | jq -r '.status')"
    echo "  deploy status: $status"
    case "$status" in
      live) return 0 ;;
      build_failed|update_failed|pre_deploy_failed|canceled)
        echo "ERROR: deploy failed with status $status" >&2
        return 1 ;;
    esac
    sleep 20
  done
  echo "ERROR: timed out waiting for deploy" >&2
  return 1
}

check_health() {
  local base_url="$1"
  local code
  code="$(curl -sS -o /tmp/render-health.json -w '%{http_code}' "${base_url}${HEALTH_PATH}")"
  echo "Health ${base_url}${HEALTH_PATH} → HTTP $code"
  if [[ "$code" != "200" ]]; then
    head -c 400 /tmp/render-health.json || true
    echo
    return 1
  fi
  jq -r 'if type=="object" then (.spots | length | tostring) + " spots" else . end' /tmp/render-health.json
}

OWNER_ID="$(resolve_owner_id)"
echo "Workspace (ownerId): $OWNER_ID"

SERVICE_ID="$(find_service_id "$OWNER_ID")"
if [[ -z "$SERVICE_ID" ]]; then
  echo "Creating web service ${SERVICE_NAME} from branch ${BRANCH}..."
  CREATE_RESP="$(create_service "$OWNER_ID")"
  SERVICE_ID="$(echo "$CREATE_RESP" | jq -r '.service.id // .id // empty')"
  if [[ -z "$SERVICE_ID" ]]; then
    echo "ERROR: create service response:" >&2
    echo "$CREATE_RESP" >&2
    exit 1
  fi
  echo "Created service id: $SERVICE_ID"
else
  echo "Found existing service id: $SERVICE_ID"
fi

SERVICE_JSON="$(api GET "/services/${SERVICE_ID}")"
SERVICE_URL="$(echo "$SERVICE_JSON" | jq -r '.serviceDetails.url // .service.serviceDetails.url // empty')"
if [[ -z "$SERVICE_URL" ]]; then
  SERVICE_URL="https://${SERVICE_NAME}.onrender.com"
fi
APP_ORIGIN="${APP_ORIGIN:-${SERVICE_URL%/}}"

echo "Setting environment variables (merge per key)..."

# Known public values (safe defaults from migration docs)
VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://pfxcqfwkdzmcrgbajqch.supabase.co}"
VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-pfxcqfwkdzmcrgbajqch}"
NODE_ENV="${NODE_ENV:-production}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash}"

upsert_env_var "$SERVICE_ID" NODE_ENV "$NODE_ENV"
upsert_env_var "$SERVICE_ID" GEMINI_MODEL "$GEMINI_MODEL"
upsert_env_var "$SERVICE_ID" VITE_SUPABASE_URL "$VITE_SUPABASE_URL"
upsert_env_var "$SERVICE_ID" VITE_SUPABASE_PROJECT_ID "$VITE_SUPABASE_PROJECT_ID"
upsert_env_var "$SERVICE_ID" APP_ORIGIN "$APP_ORIGIN"

optional_keys=(
  VITE_SUPABASE_PUBLISHABLE_KEY
  VITE_GOOGLE_MAPS_PLATFORM_KEY
  VITE_PAYMENTS_CLIENT_TOKEN
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  GEMINI_API_KEY
)

missing=()
for key in "${optional_keys[@]}"; do
  if [[ -n "${!key:-}" ]]; then
    upsert_env_var "$SERVICE_ID" "$key" "${!key}"
    echo "  set $key"
  else
    missing+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo ""
  echo "Still unset (add to $RENDER_ENV_FILE or export before re-running):"
  printf '  - %s\n' "${missing[@]}"
  echo ""
fi

echo "Triggering deploy..."
DEPLOY_RESP="$(trigger_deploy "$SERVICE_ID")"
DEPLOY_ID="$(echo "$DEPLOY_RESP" | jq -r '.id // empty')"
if [[ -z "$DEPLOY_ID" ]]; then
  echo "Deploy response:" "$DEPLOY_RESP"
  exit 1
fi
echo "Deploy id: $DEPLOY_ID"

wait_for_deploy "$SERVICE_ID" "$DEPLOY_ID"

echo ""
echo "=== Render deployment summary ==="
echo "serviceId:   $SERVICE_ID"
echo "serviceUrl:  $SERVICE_URL"
echo "appOrigin:   $APP_ORIGIN"
echo "branch:      $BRANCH"
echo "healthPath:  $HEALTH_PATH"

if check_health "$SERVICE_URL"; then
  echo "Health check OK."
else
  echo "Health check failed (service may still be waking on free tier)." >&2
  exit 1
fi
