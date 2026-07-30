---
description: Erstellt ein neues Release der WoT App — Version bumpen, APK bauen, F-Droid Repo aktualisieren, OTA-Bundle erstellen. Nutze diesen Skill wenn ein neues Release veröffentlicht werden soll.
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep]
---

# Android Release

Erstellt ein neues Release der WoT Demo App. Unterstützt drei Modi:

- **`ota`** — Nur Web-Änderungen, OTA-Bundle über GitHub Pages (kein APK nötig)
- **`apk`** — Neues APK mit Version-Bump, signiert, ins F-Droid Repo
- **`full`** — Beides: APK + OTA

## Umgebung

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
DEMO_DIR="$REPO_ROOT/apps/demo"
FDROID_DIR="$REPO_ROOT/packages/wot-fdroid"
export PATH="$HOME/Android/Sdk/build-tools/36.0.0:$PATH"
```

**Voraussetzungen prüfen, bevor du anfängst:**

```bash
node -v && pnpm -v                          # Schritt 4
java -version && command -v apksigner       # Schritt 5a/5b
```

Schritt 4 braucht nur Node. Schritt 5a und 5b brauchen ein **JDK**: `./gradlew`, `keytool` und `apksigner` sind allesamt Java-Programme. Fehlt Java (z.B. in einer Agent-Sandbox), lässt sich der Ablauf sauber teilen — Web-Build und Verifikation bis Schritt 4 hier erledigen, die nativen Schritte auf einer Umgebung mit JDK. Nicht versuchen, das zu umgehen.

## Ablauf

### Schritt 1: Modus bestimmen

Interpretiere $ARGUMENTS:

- `ota`, `web`, `hotfix` → Modus `ota`
- `apk`, `native`, `fdroid` → Modus `apk`
- `full`, `release`, ohne Argument → Modus `full`
- Optional: Versionsnummer z.B. `0.2.0` → nutze diese, sonst auto-increment

### Schritt 2: Prüfe was sich geändert hat

```bash
cd "$REPO_ROOT"
# --match ist Pflicht: ohne greift describe den naechstgelegenen Tag BELIEBIGER Art
# (core-v0.4.1, adapter-yjs-v0.1.8, ota-<sha>) und der Changelog wird still leer
# oder falsch, ohne dass irgendetwas fehlschlaegt.
LAST_TAG=$(git describe --tags --abbrev=0 --match "v[0-9]*" 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
  echo "--- apps/demo ---"
  git log --oneline "$LAST_TAG"..HEAD -- apps/demo/
  # packages/ NICHT weglassen: wot-core & Co landen ueber das Web-Bundle im APK,
  # tauchen aber in einem auf apps/demo gefilterten Log nicht auf.
  echo "--- packages/ (landen ueber das Web-Bundle im APK) ---"
  git log --oneline "$LAST_TAG"..HEAD -- packages/
fi
```

Prüfe ob native Änderungen dabei sind:

```bash
git diff --name-only "$LAST_TAG"..HEAD -- \
  apps/demo/android/ \
  apps/demo/ios/ \
  apps/demo/capacitor.config.ts
```

Wenn native Änderungen vorhanden aber Modus `ota` gewählt:
- **Warne den User:** "Es gibt native Änderungen die per OTA nicht deployed werden. Sicher dass du nur OTA willst?"

### Schritt 3: Version bumpen (nur bei `apk` oder `full`)

Lies aktuelle Version:

```bash
cat "$DEMO_DIR/android/version.properties"
```

Bump-Logik (wenn keine Version angegeben):
- Patch-Bump: `0.1.0` → `0.1.1`, VERSION_CODE +1

Aktualisiere:

1. `apps/demo/android/version.properties` — VERSION_CODE und VERSION_NAME
2. `packages/wot-fdroid/fdroid/metadata/org.reallife.weboftrust.yml` — CurrentVersion und CurrentVersionCode

Zeige dem User die neue Version und frage ob sie passt.

### Schritt 4: Web-Assets bauen

**Wichtig:** Backend-URLs UND OTA-Channel explizit als Env-Variablen mitgeben — nicht auf die `.env`-Defaults verlassen (Belt-and-Suspenders: falls die `.env` je driftet, backt dieser Befehl trotzdem den richtigen Produktions-Server). Ein falsch gebackenes Relay wandert sonst still in ein signiertes Release.

```bash
cd "$DEMO_DIR"
VITE_RELAY_URL=wss://relay.web-of-trust.de \
VITE_PROFILE_SERVICE_URL=https://profiles.web-of-trust.de \
VITE_VAULT_URL=https://vault.web-of-trust.de \
VITE_UPDATE_SERVER_URL=https://web-of-trust.de \
VITE_UPDATE_CHANNEL=android-foss \
pnpm build:mobile
```

`build:mobile` setzt bereits `VITE_BASE_PATH=/`, baut und synct.

**Verifizieren (bevor signiert wird):** das gebaute Bundle darf NUR die Server-URLs enthalten:
```bash
d="$DEMO_DIR/dist/assets"
grep -rl "utopia-lab" $d/*.js | wc -l    # MUSS 0 sein (alte, tote Relay)
grep -rl "relay.box"  $d/*.js | wc -l    # MUSS 0 sein (Festival-Box)
grep -rlE "wss://relay\.web-of-trust\.de" $d/*.js | wc -l  # MUSS >=1 sein
```

### Schritt 5a: F-Droid APK bauen (bei `apk` oder `full`)

**Achtung:** Der fdroid-Flavor nutzt `signingConfig signingConfigs.debug` (siehe
`app/build.gradle`), d.h. Gradle baut ein **Debug-signiertes** APK namens
`app-fdroid-release.apk` (NICHT `-unsigned`). Es MUSS danach mit dem F-Droid-Key
nachsigniert werden (apksigner ersetzt die Debug-Signatur), sonst bricht die
Signatur-Kontinuität und ein Update über die vorige Version schlägt fehl.

```bash
cd "$DEMO_DIR/android"
./gradlew assembleFdroidRelease
```

APK signieren und ins F-Droid Repo kopieren:

```bash
cd "$FDROID_DIR/fdroid"
KEYSTORE="$HOME/.android/fdroid-keystore.p12"
# Bewusst ohne awk '{print $2}': wird dieser Skill mit Argumenten aufgerufen,
# ersetzt der Harness $1/$2/... im Snippet durch Woerter aus den Argumenten.
# Das Passwort waere dann still Muell. sed kommt ohne Positionsparameter aus.
PASS=$(sed -n 's/^keystorepass:[[:space:]]*//p' config.yml)
ALIAS=$(keytool -list -keystore "$KEYSTORE" -storetype PKCS12 -storepass "$PASS" 2>/dev/null | grep PrivateKeyEntry | cut -d, -f1)
VERSION_CODE=$(grep VERSION_CODE "$DEMO_DIR/android/version.properties" | cut -d= -f2)

export PATH="$HOME/Android/Sdk/build-tools/36.0.0:$PATH"
# Gebautes APK robust finden (Debug-signiert, Name = app-fdroid-release.apk).
UNSIGNED=$(ls "$DEMO_DIR/android/app/build/outputs/apk/fdroid/release/"*.apk | grep -v -- '-unsigned' | head -1)
apksigner sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$ALIAS" \
  --ks-pass "pass:$PASS" \
  --key-pass "pass:$PASS" \
  --out "repo/org.reallife.weboftrust_${VERSION_CODE}.apk" \
  "$UNSIGNED"

# Signatur-Kontinuität verifizieren: SHA-256 MUSS dem F-Droid-Repo-Fingerprint
# entsprechen (8371f8dea9c3f7c104460ab7d8c7d2432445ab28fd83beafe0db5c835b020a87).
apksigner verify --print-certs "repo/org.reallife.weboftrust_${VERSION_CODE}.apk" | grep -i "SHA-256"
```

F-Droid Index aktualisieren:

```bash
fdroid update
```

Falls `fdroid` nicht installiert: `pip install fdroidserver`

### Schritt 5b: Play Store AAB bauen (optional)

```bash
cd "$DEMO_DIR/android"
./gradlew bundlePlaystoreRelease
```

AAB: `app/build/outputs/bundle/playstoreRelease/app-playstore-release.aab`

Sage dem User den Pfad — Upload manuell über https://play.google.com/console

### Schritt 5c: OTA-Bundle (bei `ota` oder `full`)

Passiert automatisch bei Push auf `main` — GitHub Actions baut die 3 Channel-Bundles.

### Schritt 6: Commit + Tag + Push

```bash
cd "$REPO_ROOT"
VERSION_NAME=$(grep VERSION_NAME "$DEMO_DIR/android/version.properties" | cut -d= -f2)

git add apps/demo/android/version.properties
git commit -m "release: v${VERSION_NAME}"
git tag "v${VERSION_NAME}"
```

Frage den User ob gepusht werden soll. Wenn ja:

```bash
git push && git push --tags
```

### Schritt 7: F-Droid Repo deployen

Sage dem User: "Lade den Ordner `packages/wot-fdroid/fdroid/` per FileZilla auf den Server hoch."

Alternativ:

```bash
rsync -av "$FDROID_DIR/fdroid/" user@server:/path/to/wot-fdroid/fdroid/
```

### Schritt 8: Zusammenfassung

Zeige dem User:

- Welcher Modus (ota/apk/full)
- Neue Version (wenn gebumpt)
- Was gebaut wurde (APK-Pfad, OTA-Tag)
- Nächste Schritte (F-Droid Repo hochladen, Play Console)

## Changelog generieren

```bash
git log --oneline "$LAST_TAG"..HEAD -- apps/demo/ packages/ | sed 's/^[a-f0-9]* /- /'
```

`$LAST_TAG` muss aus Schritt 2 stammen, also mit `--match "v[0-9]*"` ermittelt sein. Und `packages/` gehoert dazu, sonst fehlen im Changelog genau die Aenderungen, die ueber das Web-Bundle im APK landen.
