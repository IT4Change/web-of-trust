#!/usr/bin/env bash
# Kanonischer Android-Build vom Tag — WoT Demo App.
#
# Designprinzip "Plattform ist Trigger, nicht Gehirn": die CI-Workflow-Datei
# (.github/workflows/build-on-tag.yml) ist eine duenne Huelle um dieses Skript.
# Ein Umzug zu Forgejo/GitLab tauscht die Huelle, nicht die Logik. Das Skript
# laeuft identisch lokal, in GitHub Actions und spaeter im wot-release-Runner.
#
# Was es garantiert:
#   1. Gebaut wird EXAKT der uebergebene Tag (HEAD muss ihn tragen).
#   2. version.properties stimmt mit dem Tag ueberein — die Klasse
#      "Tag behauptet 0.2.6, Binary ist etwas anderes" stirbt hier.
#   3. Backend-URLs sind explizit gesetzt und gegen eine Allowlist geprueft,
#      BEVOR irgendetwas signierfaehig wird.
#   4. Output ist ein UNSIGNIERTES/debug-signiertes APK + build-info.json +
#      SHA256SUMS. Signiert wird woanders (Schluessel-Verwahrung!).
set -euo pipefail

# ---------------------------------------------------------------- App-Profil
APP_DIR=apps/demo
APP_ID=org.reallife.weboftrust
TAG_PREFIX=app-v                               # einheitlich mit RLS; die App
                                               # teilt sich das Repo mit den
                                               # npm-Paketen (core-v*, adapter-*)
                                               # — ein nacktes v* war der einzige
                                               # unpraefigierte Namensraum.
                                               # Alt-Tags v0.2.1..v0.2.7 bleiben
                                               # als Historie; app-v0.2.7 ist als
                                               # Uebergangs-Tag auf demselben
                                               # Commit gesetzt.
BUILD_SCRIPT=build:mobile
GRADLE_TASK=assembleFdroidRelease              # fdroid-Flavor, debug-signiert
APK_OUT="$APP_DIR/android/app/build/outputs/apk/fdroid/release"
UPDATE_SERVER=https://web-of-trust.de
BUILD_ENV=(
  VITE_BASE_PATH=/
  VITE_RELAY_URL=wss://relay.web-of-trust.de
  VITE_PROFILE_SERVICE_URL=https://profiles.web-of-trust.de
  VITE_VAULT_URL=https://vault.web-of-trust.de
  VITE_UPDATE_SERVER_URL="$UPDATE_SERVER"
  VITE_UPDATE_CHANNEL=android-foss
)
# Workspace-Pakete, die vor dem App-Build gebaut sein muessen. Reihenfolge und
# Auswahl gespiegelt aus deploy.yml (dort seit Monaten bewaehrt).
build_workspace_deps() {
  pnpm --filter @web_of_trust/core build
  pnpm --filter @web_of_trust/adapter-yjs build
  pnpm --filter @web_of_trust/adapter-automerge build
}
# ---------------------------------------------------------------------------

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "Aufruf: $0 <tag>   (z.B. ${TAG_PREFIX}0.2.8)" >&2
  exit 1
fi

abort() { echo "ABBRUCH: $*" >&2; exit 1; }

echo "==> 1/6 Tag- und Versionskonsistenz"
case "$TAG" in
  "$TAG_PREFIX"[0-9]*) ;;
  *) abort "Tag '$TAG' passt nicht zum Praefix '$TAG_PREFIX'." ;;
esac

# HEAD muss den Tag tragen. Sonst baut man einen Stand und behauptet einen
# anderen — exakt die Provenienz-Luecke, wegen der es dieses Skript gibt.
# -F: der Tag ist ein LITERAL, kein Regex — sonst sind die Punkte in 0.2.7
# Wildcards, und ein praeparierter Tag koennte als Muster wirken.
if ! git tag --points-at HEAD | grep -qxF "$TAG"; then
  abort "HEAD traegt den Tag '$TAG' nicht. Erst den Tag auschecken."
fi

WANT="${TAG#"$TAG_PREFIX"}"
VERSION_FILE="$APP_DIR/android/version.properties"
VERSION_NAME=$(grep VERSION_NAME "$VERSION_FILE" | cut -d= -f2)
VERSION_CODE=$(grep VERSION_CODE "$VERSION_FILE" | cut -d= -f2)
if [ "$VERSION_NAME" != "$WANT" ]; then
  abort "Tag sagt $WANT, version.properties sagt $VERSION_NAME. Genau diese Drift hat am 23.07.2026 ein falsch versioniertes Release erzeugt."
fi
echo "    ok: $TAG == version.properties ($VERSION_NAME, Code $VERSION_CODE)"

echo "==> 2/6 Dependencies (frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> 3/6 Workspace-Pakete bauen"
build_workspace_deps

echo "==> 4/6 Web-Assets bauen (URLs explizit gepinnt)"
( cd "$APP_DIR" && env "${BUILD_ENV[@]}" pnpm "$BUILD_SCRIPT" )

echo "==> 5/6 Bundle verifizieren"
d="$APP_DIR/dist/assets"
for bad in utopia-lab relay.box; do
  if grep -rlq "$bad" "$d"/*.js; then
    abort "'$bad' im Bundle gefunden (tote/lokale Infrastruktur)."
  fi
done
# Alle ws/wss-URLs EINMAL extrahieren, Positiv- und Allowlist-Pruefung auf
# derselben Liste. Der Anker ([/:?#]|$) ist entscheidend: ein blosses
# Praefix-Match liesse wss://relay.web-of-trust.de.angreifer.tld durch und
# haette es zugleich als "Produktions-Relay vorhanden" gezaehlt.
WS_URLS=$(grep -rhoE "wss?://[^\"'\`[:space:]]+" "$d"/*.js | sort -u || true)
ALLOW='^wss://relay\.web-of-trust\.de([/:?#]|$)'
printf '%s\n' "$WS_URLS" | grep -qE "$ALLOW" \
  || abort "Produktions-Relay fehlt im Bundle."
UNEXPECTED_WS=$(printf '%s\n' "$WS_URLS" | grep -vE "$ALLOW" || true)
if [ -n "$UNEXPECTED_WS" ]; then
  echo "ABBRUCH: unerwartete WebSocket-URLs im Bundle:" >&2
  printf '  %s\n' $UNEXPECTED_WS >&2
  exit 1
fi
echo "    ok: WebSocket-Allowlist bestanden"
echo "    HTTPS-Hosts im Bundle (zur Durchsicht):"
grep -rhoE "https://[a-zA-Z0-9.-]+" "$d"/*.js | sed 's|https://|      |' | sort -u

echo "==> 6/6 Android-Build"
rm -rf "$APK_OUT"
( cd "$APP_DIR/android" && ./gradlew --no-daemon "$GRADLE_TASK" )

# APK waehlen — ohne Pipe: unter pipefail bricht sowohl ein leerer grep -v als
# auch ein leeres ls die Zuweisung ab, bevor Fallback/Fehlermeldung greifen.
shopt -s nullglob
APKS=("$APK_OUT"/*.apk)
shopt -u nullglob
[ ${#APKS[@]} -gt 0 ] || abort "kein APK in $APK_OUT"
BUILT=""
for a in "${APKS[@]}"; do
  case "$a" in *-unsigned.apk) continue ;; esac
  BUILT="$a"; break
done
[ -n "$BUILT" ] || BUILT="${APKS[0]}"

OUT=out/release
rm -rf "$OUT" && mkdir -p "$OUT"
cp "$BUILT" "$OUT/"
COMMIT=$(git rev-parse HEAD)
# JSON maschinell erzeugen statt per Heredoc zusammenzukleben: die
# Java-Versionszeile enthaelt Anfuehrungszeichen, und Hand-Escaping hat
# nachweislich ungueltiges JSON erzeugt. Werte gehen als Env hinein, node
# uebernimmt das Escaping. Bewusst KEIN Zeitstempel — die Datei soll bei
# einem Reproduzierbarkeits-Vergleich zweier Builds identisch sein.
BI_APP="$APP_ID" BI_TAG="$TAG" BI_COMMIT="$COMMIT" \
BI_VNAME="$VERSION_NAME" BI_VCODE="$VERSION_CODE" BI_TASK="$GRADLE_TASK" \
BI_NODE="$(node --version)" BI_PNPM="$(pnpm --version)" \
BI_JAVA="$(java -version 2>&1 | head -1)" \
node -e '
const e = process.env;
require("fs").writeFileSync(process.argv[1], JSON.stringify({
  app: e.BI_APP, tag: e.BI_TAG, commit: e.BI_COMMIT,
  versionName: e.BI_VNAME, versionCode: Number(e.BI_VCODE),
  gradleTask: e.BI_TASK, updateChannel: "android-foss",
  toolchain: { node: e.BI_NODE, pnpm: e.BI_PNPM, java: e.BI_JAVA },
  signed: false,
  note: "Debug-/unsigniert. Signierung erfolgt getrennt (Schluessel-Verwahrung)."
}, null, 2) + "\n");
' "$OUT/build-info.json"
# Selbstpruefung: das Ergebnis MUSS parsebares JSON sein.
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$OUT/build-info.json"

( cd "$OUT" && sha256sum ./* > SHA256SUMS )

echo
echo "FERTIG: $OUT/"
ls -la "$OUT/"
