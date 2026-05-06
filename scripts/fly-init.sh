#!/usr/bin/env bash
# Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
# One-time Fly.io setup for VGXTaskCo backend.
# Run from repo root after: fly auth login
#
# Usage: bash scripts/fly-init.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
APP_NAME="vgxtaskco-api"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at $ENV_FILE"
  echo "Copy .env.example and fill in your values first."
  exit 1
fi

if ! command -v fly &>/dev/null; then
  echo "ERROR: flyctl not installed. Run: curl -L https://fly.io/install.sh | sh"
  exit 1
fi

# Load .env without exporting every var into the shell environment
get_env() {
  grep -E "^$1=" "$ENV_FILE" | head -1 | sed 's/^[^=]*=//;s/^"//;s/"$//'
}

DATABASE_URL=$(get_env DATABASE_URL)
JWT_SECRET=$(get_env JWT_SECRET)
API_TOKEN_PEPPER=$(get_env API_TOKEN_PEPPER)
SUPABASE_URL=$(get_env SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY=$(get_env SUPABASE_SERVICE_ROLE_KEY)

# Validate required vars
for var in DATABASE_URL JWT_SECRET API_TOKEN_PEPPER SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  if [[ -z "${!var}" ]]; then
    echo "ERROR: $var is empty in .env"
    exit 1
  fi
done

echo "--- Creating Fly.io app: $APP_NAME ---"
fly apps create "$APP_NAME" 2>/dev/null || \
  echo "App already exists, skipping."

echo ""
echo "--- Setting secrets ---"
VERCEL_URL="${VERCEL_URL:-https://vgxtaskco.vercel.app}"

fly secrets set \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  API_TOKEN_PEPPER="$API_TOKEN_PEPPER" \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  ALLOWED_FRONTEND_ORIGINS="$VERCEL_URL" \
  NODE_ENV="production" \
  --app "$APP_NAME"

echo ""
echo "--- Deploying ---"
fly deploy --remote-only --app "$APP_NAME"

echo ""
echo "Backend live at: https://$APP_NAME.fly.dev"
echo ""
echo "Add this as the FLY_API_TOKEN GitHub secret for auto-deploy on push:"
echo ""
fly tokens create deploy -x 999999h --app "$APP_NAME"
echo ""
echo "Done. Now set ALLOWED_FRONTEND_ORIGINS once you have your Vercel URL:"
echo "  fly secrets set ALLOWED_FRONTEND_ORIGINS=\"https://your-project.vercel.app\" --app $APP_NAME"
