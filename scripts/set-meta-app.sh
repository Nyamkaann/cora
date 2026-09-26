#!/usr/bin/env bash
# Moves the new Meta app's credentials into .env.local and Vercel production.
#
# The app secret is read from the clipboard and never printed: copy it from
# the Meta app settings page (App settings -> Basic -> App secret -> Show),
# then run this script from the repo root.
#
#   ./scripts/set-meta-app.sh
#
set -euo pipefail

APP_ID="1393366656291867"
ENV_FILE=".env.local"

secret="$(pbpaste | tr -d '[:space:]')"

if [[ ! "$secret" =~ ^[0-9a-f]{32}$ ]]; then
  echo "Clipboard does not hold a Meta app secret (expected 32 hex characters)." >&2
  echo "Copy the secret from the Meta app settings page and run this again." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE not found. Run this from the repo root." >&2
  exit 1
fi

cp "$ENV_FILE" "$ENV_FILE.bak"

# Replace the two keys in place, leaving every other line untouched.
awk -v id="$APP_ID" -v sec="$secret" '
  /^META_APP_ID=/     { print "META_APP_ID=" id; seen_id = 1; next }
  /^META_APP_SECRET=/ { print "META_APP_SECRET=" sec; seen_secret = 1; next }
                      { print }
  END {
    if (!seen_id)     print "META_APP_ID=" id
    if (!seen_secret) print "META_APP_SECRET=" sec
  }
' "$ENV_FILE.bak" > "$ENV_FILE"

echo "Updated $ENV_FILE (backup at $ENV_FILE.bak)"

# Vercel keeps its own copy: replace both there too.
npx -y vercel@59.25.4 env rm META_APP_ID production --yes >/dev/null 2>&1 || true
npx -y vercel@59.25.4 env rm META_APP_SECRET production --yes >/dev/null 2>&1 || true

printf '%s' "$APP_ID" | npx -y vercel@59.25.4 env add META_APP_ID production --type config >/dev/null
printf '%s' "$secret" | npx -y vercel@59.25.4 env add META_APP_SECRET production --type secret >/dev/null

echo "Updated Vercel production environment"

unset secret
echo "Done. Clear your clipboard when convenient."
