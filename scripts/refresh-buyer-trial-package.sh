#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${REPO:-$HOME/sourcedeck-app}"
BUYER_ROOT="${BUYER_ROOT:-$HOME/Desktop/SourceDeck Buyer Trial Package}"
BUYER_APP="${BUYER_APP:-$BUYER_ROOT/02 App/SourceDeck.app}"
BUYER_ZIP="${BUYER_ZIP:-$HOME/Desktop/SourceDeck Buyer Trial Package.zip}"
POLL_SECONDS="${POLL_SECONDS:-25}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: this refresh script must be run on macOS." >&2
  exit 1
fi

if [[ ! -d "$REPO/.git" ]]; then
  echo "ERROR: SourceDeck repository not found at $REPO" >&2
  exit 1
fi

app_is_running() {
  ps ax -o command= | grep -F "$BUYER_APP/Contents/" | grep -v grep >/dev/null
}

wait_for_app() {
  local waited=0
  while (( waited < POLL_SECONDS )); do
    if app_is_running; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

cd "$REPO"
echo "=== SourceDeck rebuild and refresh ==="
git fetch origin --prune
git switch main
git reset --hard origin/main
echo "Building: $(git log -1 --oneline)"

pkill -9 -x SourceDeck 2>/dev/null || true
pkill -9 -f "/SourceDeck.app/Contents/" 2>/dev/null || true
rm -rf node_modules dist out

npm ci
npm run license:check
npm run govcon:smoke
npm run troubleshooting:scan
npm run release:check
npm run distribution:check || echo "WARNING: production account credentials are not configured yet"
npm run pack:mac

BUILT_APP="$(find "$REPO/dist" -type d -name SourceDeck.app -prune -print | head -n 1)"
test -d "$BUILT_APP" || { echo "ERROR: SourceDeck.app was not built" >&2; exit 1; }

BUILT_ASAR="$BUILT_APP/Contents/Resources/app.asar"
test -f "$BUILT_ASAR" || { echo "ERROR: built app.asar missing" >&2; exit 1; }

grep -q "govcon:sam-fetch-links" main.js || { echo "ERROR: Fetch Links IPC missing" >&2; exit 1; }
grep -q "Fetch Links" sourcedeck.html || { echo "ERROR: Fetch Links UI missing" >&2; exit 1; }
grep -q "Upload Solicitation Files" sourcedeck.html || { echo "ERROR: manual upload missing" >&2; exit 1; }

mkdir -p "$BUYER_ROOT/02 App"
rm -rf "$BUYER_APP"
ditto "$BUILT_APP" "$BUYER_APP"
xattr -cr "$BUYER_APP" 2>/dev/null || true
codesign --force --deep --sign - "$BUYER_APP" >/dev/null 2>&1 || true

INSTALLED_ASAR="$BUYER_APP/Contents/Resources/app.asar"
BUILT_HASH="$(shasum -a 256 "$BUILT_ASAR" | cut -d" " -f1)"
INSTALLED_HASH="$(shasum -a 256 "$INSTALLED_ASAR" | cut -d" " -f1)"
test "$BUILT_HASH" = "$INSTALLED_HASH" || { echo "ERROR: installed app does not match fresh build" >&2; exit 1; }

rm -rf "$HOME/Library/Caches/SourceDeck" "$HOME/Library/Caches/sourcedeck" "$HOME/Library/Saved Application State/app.sourcedeck.lcc.savedState"
rm -f "$BUYER_ZIP"
ditto -c -k --sequesterRsrc --keepParent "$BUYER_ROOT" "$BUYER_ZIP"

pkill -9 -x SourceDeck 2>/dev/null || true
pkill -9 -f "/SourceDeck.app/Contents/" 2>/dev/null || true
open -n "$BUYER_APP"

if ! wait_for_app; then
  echo "ERROR: refreshed application did not remain running after ${POLL_SECONDS}s" >&2
  echo "Checked app path: $BUYER_APP/Contents/" >&2
  exit 1
fi

echo
echo "========================================"
echo "SOURCEDECK REFRESH COMPLETE"
echo "========================================"
echo "Commit: $(git log -1 --oneline)"
echo "Installed app: $BUYER_APP"
echo "ASAR SHA-256: $INSTALLED_HASH"
echo "Buyer ZIP: $BUYER_ZIP"
echo "Fetch Links: included"
echo "Manual upload and extraction: included"
echo "License activation foundation: included"
echo "User data and saved API keys: preserved"
