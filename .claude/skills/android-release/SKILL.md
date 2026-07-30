---
description: Erstellt ein neues Release einer der beiden Android-Apps — WoT Demo oder RLS Reference. Version bumpen, APK bauen, F-Droid Repo aktualisieren, OTA-Bundle erstellen. Nutze diesen Skill wenn ein neues Release veröffentlicht werden soll.
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep]
---

# Android Release

Erstellt ein neues Release einer Android-App. **Zwei Apps, ein Ablauf:**

- **`wot`** — Web of Trust Demo (`web-of-trust`, `apps/demo`)
- **`rls`** — Real Life Stack Reference (`real-life-stack`, `apps/reference`)

Und drei Modi:

- **`ota`** — Nur Web-Änderungen, OTA-Bundle über GitHub Pages (kein APK nötig)
- **`apk`** — Neues APK mit Version-Bump, signiert, ins F-Droid Repo
- **`full`** — Beides: APK + OTA

## Voraussetzungen prüfen, bevor du anfängst

```bash
node -v && pnpm -v                                            # Schritt 4
java -version && command -v keytool && command -v apksigner   # Schritt 5a/5b
```

Schritt 4 braucht nur Node. Schritt 5a und 5b brauchen ein **JDK**: `./gradlew`, `keytool` und `apksigner` sind allesamt Java-Programme. Fehlt Java (z.B. in einer Agent-Sandbox), lässt sich der Ablauf sauber teilen — Web-Build und Verifikation bis Schritt 4 hier erledigen, die nativen Schritte auf einer Umgebung mit JDK. Nicht versuchen, das zu umgehen.

## Ablauf

### Schritt 1: App und Modus bestimmen

Interpretiere $ARGUMENTS:

- App: `wot`, `demo`, `web-of-trust` → **wot** · `rls`, `stack`, `reference` → **rls**
- Modus: `ota`, `web`, `hotfix` → `ota` · `apk`, `native`, `fdroid` → `apk` · `full`, `release`, ohne Angabe → `full`
- Optional eine Versionsnummer wie `0.2.1`, sonst Auto-Increment

**Ohne erkennbare App: nachfragen, nicht raten.** Ein Release der falschen App signiert ein falsches Binary unter einem fremden Paketnamen.

### Schritt 2: App-Profil setzen

Alle Unterschiede zwischen den beiden Apps stehen ausschließlich hier. Der restliche
Ablauf ist identisch.

```bash
# Das F-Droid-Repo liegt IMMER im web-of-trust-Repo — auch fuer die RLS-App.
WOT_REPO=~/workspace/workspace/web-of-trust
FDROID_DIR="$WOT_REPO/packages/wot-fdroid"

case "$APP" in
  wot)
    APP_REPO="$WOT_REPO"
    APP_DIR="$APP_REPO/apps/demo"
    APP_ID=org.reallife.weboftrust
    BUILD_SCRIPT=build:mobile
    GRADLE_TASK=assembleFdroidRelease
    APK_OUT="$APP_DIR/android/app/build/outputs/apk/fdroid/release"
    # Pakete, die ueber das Web-Bundle im APK landen (fuer den Changelog).
    BUNDLED="packages/wot-core/ packages/adapter-yjs/ packages/adapter-automerge/"
    UPDATE_SERVER=https://web-of-trust.de
    HAS_VAULT=yes
    ;;
  rls)
    APP_REPO=~/workspace/workspace/rls-p3a
    APP_DIR="$APP_REPO/apps/reference"
    APP_ID=org.reallife.reallifestack
    BUILD_SCRIPT=build:android
    GRADLE_TASK=assembleRelease      # RLS hat KEINEN fdroid-Flavor
    APK_OUT="$APP_DIR/android/app/build/outputs/apk/release"
    BUNDLED="packages/wot-connector/"
    UPDATE_SERVER=https://real-life-stack.de
    HAS_VAULT=no
    ;;
esac

METADATA="$FDROID_DIR/fdroid/metadata/${APP_ID}.yml"
VERSION_FILE="$APP_DIR/android/version.properties"
```

**Die wichtigste Asymmetrie:** Bei `rls` liegt `version.properties` im
**real-life-stack**-Repo, die F-Droid-Metadaten aber im **web-of-trust**-Repo. Ein
RLS-Release braucht deshalb **zwei Commits in zwei Repos**. Genau weil das leicht zu
vergessen ist, wurde am 23.07.2026 ein APK mit VersionCode 3 gebaut und die Metadaten
gebumpt, während die Quelle auf 0.2.0 stehen blieb. Schritt 6 erzwingt jetzt beide
Hälften.

Bei `wot` liegen beide im selben Repo, dort ist es ein Commit.

### Schritt 3: Prüfe was sich geändert hat

```bash
cd "$APP_REPO"
# --match ist Pflicht: ohne greift describe den naechstgelegenen Tag BELIEBIGER Art
# (core-v0.4.1, adapter-yjs-v0.1.8, ota-<sha>) und der Changelog wird still leer
# oder falsch, ohne dass irgendetwas fehlschlaegt.
LAST_TAG=$(git describe --tags --abbrev=0 --match "v[0-9]*" 2>/dev/null || echo "")

# Leeres LAST_TAG NICHT stillschweigend durchlassen: "$LAST_TAG"..HEAD wuerde zu
# "..HEAD" und das liest Git als HEAD..HEAD, also als leere Range. Der Changelog
# waere dann leer und der Lauf trotzdem gruen — dieselbe stille Falle wie der
# fehlende --match-Filter.
if [ -z "$LAST_TAG" ]; then
  echo "ABBRUCH: kein v*-Tag gefunden." >&2
  echo "Fuer ein Erstrelease eine Basis explizit setzen, z.B.:" >&2
  echo "  LAST_TAG=\$(git rev-list --max-parents=0 HEAD | head -1)" >&2
  exit 1
fi

APP_REL=${APP_DIR#$APP_REPO/}
echo "--- $APP_REL ---"
git log --oneline "$LAST_TAG"..HEAD -- "$APP_REL/"
# Die gebuendelten Pakete NICHT weglassen: sie landen ueber das Web-Bundle im APK,
# tauchen aber in einem auf die App gefilterten Log nicht auf. Ein Filter auf ganz
# packages/ waere umgekehrt zu breit und zoege Relay, CLI und Vault mit herein.
echo "--- im APK gebuendelte Pakete ---"
git log --oneline "$LAST_TAG"..HEAD -- $BUNDLED
```

Prüfe ob native Änderungen dabei sind:

```bash
git diff --name-only "$LAST_TAG"..HEAD -- \
  "$APP_REL/android/" "$APP_REL/ios/" "$APP_REL/capacitor.config.ts"
```

Wenn native Änderungen vorhanden aber Modus `ota` gewählt:
- **Warne den User:** "Es gibt native Änderungen die per OTA nicht deployed werden. Sicher dass du nur OTA willst?"

### Schritt 4: Version bumpen (nur bei `apk` oder `full`)

```bash
cat "$VERSION_FILE"
```

Bump-Logik (wenn keine Version angegeben): Patch-Bump `0.1.0` → `0.1.1`, VERSION_CODE +1.

Aktualisiere **beide** Stellen:

1. `$VERSION_FILE` — VERSION_CODE und VERSION_NAME
2. `$METADATA` — CurrentVersion und CurrentVersionCode

Zeige dem User die neue Version und frage ob sie passt.

### Schritt 5: Web-Assets bauen

**Wichtig:** Backend-URLs UND OTA-Channel explizit als Env-Variablen mitgeben — nicht auf die Defaults im Code verlassen (Belt-and-Suspenders: falls die je driftet, backt dieser Befehl trotzdem den richtigen Produktions-Server). Ein falsch gebackenes Relay wandert sonst still in ein signiertes Release.

```bash
cd "$APP_DIR"
# VITE_BASE_PATH=/ ist Pflicht fuer Capacitor. Die WoT-Demo defaultet auf /demo/
# (GitHub Pages) und zeigt sonst ein Weissbild; build:mobile setzt es bereits, hier
# steht es trotzdem explizit, damit beide Apps denselben Aufruf haben.
VITE_BASE_PATH=/ \
VITE_RELAY_URL=wss://relay.web-of-trust.de \
VITE_PROFILE_SERVICE_URL=https://profiles.web-of-trust.de \
$( [ "$HAS_VAULT" = yes ] && echo "VITE_VAULT_URL=https://vault.web-of-trust.de" ) \
VITE_UPDATE_SERVER_URL="$UPDATE_SERVER" \
VITE_UPDATE_CHANNEL=android-foss \
pnpm "$BUILD_SCRIPT"
```

**Verifizieren, BEVOR signiert wird.** Das gebaute Bundle darf nur die Produktions-URLs enthalten:

```bash
d="$APP_DIR/dist/assets"
grep -rl "utopia-lab" $d/*.js | wc -l    # MUSS 0 sein (alte, tote Relay)
grep -rl "relay.box"  $d/*.js | wc -l    # MUSS 0 sein (Festival-Box)
grep -rlE "wss://relay\.web-of-trust\.de" $d/*.js | wc -l  # MUSS >=1 sein

# Zusaetzlich einmal ALLE Backend-URLs ansehen, statt nur auf Bekanntes zu pruefen.
# Eine neue, falsche URL faellt sonst durch jedes gezielte grep.
grep -rhoE "(wss?|https?)://[a-z0-9.-]*(web-of-trust|real-life-stack|utopia-lab|relay\.box)[a-z0-9./-]*" $d/*.js | sort -u
```

### Schritt 6a: APK bauen (bei `apk` oder `full`)

**Signatur-Kette, je App unterschiedlich:**

- **wot**: Der fdroid-Flavor nutzt `signingConfig signingConfigs.debug`, Gradle baut also ein **debug-signiertes** `app-fdroid-release.apk` (NICHT `-unsigned`).
- **rls**: Kein Flavor, kein signingConfig, Gradle baut ein **unsigniertes** APK.

In beiden Fällen wird danach mit dem F-Droid-Key nachsigniert (`apksigner` ersetzt eine vorhandene Debug-Signatur). Ohne das bricht die Signatur-Kontinuität und ein Update über die vorige Version schlägt bei allen Nutzern fehl.

**Die teuerste Falle:** Schlägt Gradle fehl und die Folgeschritte laufen trotzdem (z.B. weil die Kommandos nicht mit `&&` verkettet sind), signiert `apksigner` das APK aus einem *früheren* Build. Der Fingerprint-Check ist dann grün, weil der Schlüssel stimmt, aber der Inhalt ist veraltet. Genau so wurde am 30.07.2026 ein eine Woche alter Build als neue Version signiert.

```bash
set -euo pipefail          # ← ohne das rutscht ein gescheiterter Build durch
rm -rf "$APK_OUT"          # ← verhindert das Signieren eines Alt-APKs

cd "$APP_DIR/android"
./gradlew "$GRADLE_TASK"
```

Voraussetzung: `$APP_DIR/android/local.properties` mit `sdk.dir=...` muss existieren. Die Datei ist gitignored und fehlt deshalb in frisch angelegten Worktrees — Gradle bricht dann mit "SDK location not found" ab.

APK signieren und ins F-Droid Repo kopieren:

```bash
cd "$FDROID_DIR/fdroid"
KEYSTORE="$HOME/.android/fdroid-keystore.p12"
# Bewusst ohne awk '{print $2}': wird dieser Skill mit Argumenten aufgerufen,
# ersetzt der Harness $1/$2/... im Snippet durch Woerter aus den Argumenten.
# Das Passwort waere dann still Muell. sed kommt ohne Positionsparameter aus.
PASS=$(sed -n 's/^keystorepass:[[:space:]]*//p' config.yml)
ALIAS=$(keytool -list -keystore "$KEYSTORE" -storetype PKCS12 -storepass "$PASS" 2>/dev/null | grep PrivateKeyEntry | cut -d, -f1)
VERSION_CODE=$(grep VERSION_CODE "$VERSION_FILE" | cut -d= -f2)

# Gebautes APK robust finden. -unsigned ausschliessen deckt beide Apps ab:
# wot liefert app-fdroid-release.apk, rls ein unsigniertes app-release-unsigned.apk
# — bei rls gibt es nur dieses eine, deshalb erst filtern, dann Fallback.
BUILT=$(ls "$APK_OUT"/*.apk | grep -v -- '-unsigned' | head -1)
[ -n "$BUILT" ] || BUILT=$(ls "$APK_OUT"/*.apk | head -1)
echo "signiere: $BUILT"

export PATH="$HOME/Android/Sdk/build-tools/36.0.0:$PATH"
apksigner sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$ALIAS" \
  --ks-pass "pass:$PASS" \
  --key-pass "pass:$PASS" \
  --out "repo/${APP_ID}_${VERSION_CODE}.apk" \
  "$BUILT"

# Signatur-Kontinuität verifizieren. Der Fingerprint MUSS exakt dem Schlüssel des
# F-Droid-Repos entsprechen. Deshalb VERGLEICHEN und abbrechen — ein blosses
# `| grep SHA-256` zeigt den Wert nur an und akzeptiert jeden Fingerprint.
EXPECTED_FP=8371f8dea9c3f7c104460ab7d8c7d2432445ab28fd83beafe0db5c835b020a87
ACTUAL_FP=$(apksigner verify --print-certs "repo/${APP_ID}_${VERSION_CODE}.apk" \
  | sed -n 's/.*SHA-256 digest: *//p' | head -1)
if [ "$ACTUAL_FP" != "$EXPECTED_FP" ]; then
  echo "ABBRUCH: Fingerprint stimmt nicht." >&2
  echo "  erwartet: $EXPECTED_FP" >&2
  echo "  bekommen: ${ACTUAL_FP:-<leer>}" >&2
  exit 1
fi
echo "Signatur-Kontinuität ok: $ACTUAL_FP"
```

F-Droid Index aktualisieren:

```bash
cd "$FDROID_DIR/fdroid"
fdroid update
```

Falls `fdroid` nicht installiert: `pip install fdroidserver`

### Schritt 6b: Play Store AAB bauen (optional, nur `wot`)

```bash
cd "$APP_DIR/android"
./gradlew bundlePlaystoreRelease
```

AAB: `app/build/outputs/bundle/playstoreRelease/app-playstore-release.aab`

Sage dem User den Pfad — Upload manuell über <https://play.google.com/console>

### Schritt 6c: OTA-Bundle (bei `ota` oder `full`)

Passiert automatisch bei Push auf den Default-Branch — GitHub Actions baut die Channel-Bundles.

### Schritt 7: Commit + Tag + Push

**Bei `wot` — ein Commit, beide Dateien liegen im selben Repo:**

```bash
cd "$APP_REPO"
VERSION_NAME=$(grep VERSION_NAME "$VERSION_FILE" | cut -d= -f2)

# Gezielt die eine YAML stagen, nicht das ganze metadata/-Verzeichnis: sonst
# rutscht ein fremder Metadaten-Bump (z.B. der anderen App) mit in den Release.
git add "$VERSION_FILE" "$METADATA"

# Den Stage-Inhalt VERGLEICHEN, nicht nur anzeigen. Ein blosses Ausgeben belegt
# weder, dass beide erwarteten Dateien drin sind, noch dass nichts Fremdes
# mitgestaged wurde. (`git status --cached` gibt es uebrigens nicht, das bricht
# mit Exit 128 ab — `git diff --cached` ist die richtige Abfrage.)
EXPECTED=$(printf '%s\n' \
  "${VERSION_FILE#$APP_REPO/}" \
  "${METADATA#$APP_REPO/}" | sort)
STAGED=$(git diff --cached --name-only | sort)
if [ "$STAGED" != "$EXPECTED" ]; then
  echo "ABBRUCH: unerwarteter Stage-Inhalt." >&2
  echo "--- erwartet ---" >&2; printf '%s\n' "$EXPECTED" >&2
  echo "--- gestaged ---" >&2; printf '%s\n' "$STAGED" >&2
  exit 1
fi

git commit -m "release: v${VERSION_NAME}"
git tag "v${VERSION_NAME}"
```

**Bei `rls` — ZWEI Commits in ZWEI Repos.** Beide Hälften gehören zusammen; wird die zweite vergessen, behaupten die F-Droid-Metadaten eine Version, die im Quell-Repo nicht existiert:

```bash
# 1. Quelle im real-life-stack-Repo
cd "$APP_REPO"
VERSION_NAME=$(grep VERSION_NAME "$VERSION_FILE" | cut -d= -f2)
git add "$VERSION_FILE"
git diff --cached --name-only   # MUSS genau version.properties zeigen
git commit -m "release: Android App v${VERSION_NAME} (${VERSION_CODE})"
git tag "v${VERSION_NAME}"

# 2. Metadaten im web-of-trust-Repo
cd "$WOT_REPO"
git add "$METADATA"
git diff --cached --name-only   # MUSS genau die eine YAML zeigen
git commit -m "fdroid: ${APP_ID} ${VERSION_NAME} (${VERSION_CODE})"
```

Frage den User ob gepusht werden soll. Wenn ja, in **beiden** Repos:

```bash
git push && git push --tags
```

Hinweis: schlägt der Push mit `sign_and_send_pubkey: agent refused operation` fehl, klemmt der Hardware-Key. Dann über HTTPS pushen statt das SSH-Remote zu ändern.

### Schritt 8: F-Droid Repo deployen

Sage dem User: "Lade den Ordner `packages/wot-fdroid/fdroid/` per FileZilla auf den Server hoch."

Alternativ:

```bash
rsync -av "$FDROID_DIR/fdroid/" user@server:/path/to/wot-fdroid/fdroid/
```

Ohne diesen Schritt sehen die Nutzer weiterhin die Vorversion — Live-Repo ist
<https://fdroid.utopia-lab.org/fdroid/repo>. Zum Gegenprüfen:

```bash
curl -s https://fdroid.utopia-lab.org/fdroid/repo/index-v1.json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print({p: sorted({v['versionName'] for v in vs}, reverse=True)[:3] for p,vs in d['packages'].items()})"
```

### Schritt 9: Zusammenfassung

Zeige dem User:

- Welche App und welcher Modus
- Neue Version (wenn gebumpt)
- Was gebaut wurde (APK-Pfad, OTA-Tag)
- Bei `rls`: ausdrücklich, dass **zwei** Repos committet wurden
- Nächste Schritte (F-Droid Repo hochladen, ggf. Play Console)

## Changelog generieren

```bash
git log --oneline "$LAST_TAG"..HEAD -- "$APP_REL/" $BUNDLED | sed 's/^[a-f0-9]* /- /'
```

`$LAST_TAG` muss aus Schritt 3 stammen, also mit `--match "v[0-9]*"` ermittelt und auf Leere geprüft sein.
