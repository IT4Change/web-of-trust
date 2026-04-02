#!/usr/bin/env bash
set -euo pipefail

# Build the Web of Trust Android APK for F-Droid distribution.
#
# Usage:
#   ./scripts/build-fdroid-apk.sh           # unsigned APK
#   ./scripts/build-fdroid-apk.sh --sign    # signed APK (needs FDROID_KEYSTORE env)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$REPO_ROOT/apps/demo"

echo "==> Installing dependencies..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile

echo "==> Building web assets (VITE_BASE_PATH=/)..."
VITE_BASE_PATH=/ pnpm build --filter=demo

echo "==> Syncing Capacitor..."
cd "$DEMO_DIR"
npx cap sync android

echo "==> Building APK..."
cd "$DEMO_DIR/android"
./gradlew assembleRelease

APK_PATH="$DEMO_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo "==> APK built: $APK_PATH"

if [[ "${1:-}" == "--sign" ]]; then
    KEYSTORE="${FDROID_KEYSTORE:?Set FDROID_KEYSTORE to your keystore path}"
    KEY_ALIAS="${FDROID_KEY_ALIAS:-weboftrust}"

    SIGNED_APK="${APK_PATH%-unsigned.apk}-signed.apk"
    apksigner sign \
        --ks "$KEYSTORE" \
        --ks-key-alias "$KEY_ALIAS" \
        --out "$SIGNED_APK" \
        "$APK_PATH"

    echo "==> Signed APK: $SIGNED_APK"
fi
