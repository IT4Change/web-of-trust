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
node -v && pnpm -v                                            # Schritt 5
java -version && command -v keytool && command -v apksigner   # Schritt 6a/6b
```

Schritt 5 braucht nur Node. Schritt 6a und 6b brauchen ein **JDK**: `./gradlew`, `keytool` und `apksigner` sind allesamt Java-Programme. Fehlt Java (z.B. in einer Agent-Sandbox), lässt sich der Ablauf sauber teilen — Web-Build und Verifikation bis Schritt 5 hier erledigen, die nativen Schritte auf einer Umgebung mit JDK. Nicht versuchen, das zu umgehen.

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
    RELEASE_BRANCH=main
    GH_REPO=real-life-org/web-of-trust
    TAG_PREFIX=app-v                 # einheitlich mit RLS (seit 31.07.2026);
                                     # Alt-Tags v0.2.1..v0.2.7 sind Historie,
                                     # app-v0.2.7 ist Uebergangs-Zweit-Tag
    ;;
  rls)
    # Kanonischer Checkout, NICHT ein persoenlicher Worktree. Wer aus einem
    # Worktree released, setzt APP_REPO bewusst um und prueft vorher, dass der
    # auf dem Release-Branch steht und mit origin synchron ist.
    APP_REPO=~/workspace/workspace/real-life-stack
    APP_DIR="$APP_REPO/apps/reference"
    APP_ID=org.reallife.reallifestack
    BUILD_SCRIPT=build:android
    GRADLE_TASK=assembleRelease      # RLS hat KEINEN fdroid-Flavor
    APK_OUT="$APP_DIR/android/app/build/outputs/apk/release"
    BUNDLED="packages/wot-connector/"
    UPDATE_SERVER=https://real-life-stack.de
    HAS_VAULT=no
    RELEASE_BRANCH=master
    GH_REPO=real-life-org/real-life-stack
    TAG_PREFIX=app-v                 # RLS taggt app-v0.2.1
    ;;
esac

METADATA="$FDROID_DIR/fdroid/metadata/${APP_ID}.yml"
VERSION_FILE="$APP_DIR/android/version.properties"

# Den Checkout VALIDIEREN, nicht nur anzeigen. Ein `git status`, dessen Ausgabe
# niemand auswertet, ist keine Pruefung — und der Normalfall ist hier der
# unbrauchbare: am 30.07.2026 stand real-life-stack auf einem Feature-Branch mit
# 20 uncommitteten Dateien, 31 Commits hinterher.
#
# Fail-closed: JEDER Teilschritt bricht ab, auch ein fehlgeschlagenes fetch. Ohne
# frischen origin-Stand vergleicht man gegen eine veraltete Referenz und die
# Pruefung geht faelschlich durch.
set -euo pipefail

assert_clean_at_origin() {
  repo=$1; branch=$2; label=$3
  git -C "$repo" fetch --quiet origin "$branch" || {
    echo "ABBRUCH: konnte origin/$branch in $label nicht holen." >&2
    echo "Ohne frischen Stand ist der Vergleich wertlos." >&2
    return 1; }
  dirty=$(git -C "$repo" status --porcelain)
  if [ -n "$dirty" ]; then
    echo "ABBRUCH: $label ist nicht sauber:" >&2
    printf '%s\n' "$dirty" >&2
    return 1
  fi
  br=$(git -C "$repo" rev-parse --abbrev-ref HEAD)
  counts=$(git -C "$repo" rev-list --left-right --count "origin/$branch...HEAD") || {
    echo "ABBRUCH: origin/$branch existiert nicht in $label." >&2
    return 1; }
  behind=$(echo "$counts" | cut -f1); ahead=$(echo "$counts" | cut -f2)
  if [ "$br" != "$branch" ] || [ "$behind" -ne 0 ] || [ "$ahead" -ne 0 ]; then
    echo "ABBRUCH: $label steht nicht exakt auf origin/$branch." >&2
    echo "  Branch: $br (erwartet: $branch), $behind hinterher, $ahead voraus" >&2
    return 1
  fi
  echo "ok: $label == origin/$branch, sauber"
}

assert_clean_at_origin "$APP_REPO" "$RELEASE_BRANCH" "$APP_REPO"

# Bei rls MUSS auch das WoT-Repo vollstaendig geprueft werden — dort landen die
# Metadaten. Bewusst if/fi statt `[ … ] && …`: mit set -e wuerde ein falscher
# Test-Ausdruck den ganzen Schritt abbrechen.
if [ "$APP" = rls ]; then
  assert_clean_at_origin "$WOT_REPO" main "$WOT_REPO (Metadaten)"
fi
```

**Die wichtigste Asymmetrie:** Bei `rls` liegt `version.properties` im
**real-life-stack**-Repo, die F-Droid-Metadaten aber im **web-of-trust**-Repo. Ein
RLS-Release braucht deshalb **zwei Commits in zwei Repos** und **zwei Pushes**. Genau
weil das leicht zu vergessen ist, wurde am 23.07.2026 ein APK mit VersionCode 3 gebaut
und die Metadaten gebumpt, während die Quelle auf 0.2.0 stehen blieb. Schritt 7
erzwingt jetzt beide Hälften.

Bei `wot` liegen beide im selben Repo, dort ist es ein Commit und ein Push.

### Schritt 3: Prüfe was sich geändert hat

```bash
cd "$APP_REPO"
# --match ist Pflicht: ohne greift describe den naechstgelegenen Tag BELIEBIGER Art
# (core-v0.4.1, adapter-yjs-v0.1.8, ota-<sha>) und der Changelog wird still leer
# oder falsch, ohne dass irgendetwas fehlschlaegt. Beide Repos taggen ihre App
# einheitlich app-v* (WoT seit 31.07.2026; Alt-Tags v0.2.1..v0.2.7 bleiben als
# Historie stehen und werden von --match bewusst NICHT mehr gefunden).
LAST_TAG=$(git describe --tags --abbrev=0 --match "${TAG_PREFIX}[0-9]*" 2>/dev/null || echo "")

# Leeres LAST_TAG NICHT stillschweigend durchlassen: "$LAST_TAG"..HEAD wuerde zu
# "..HEAD" und das liest Git als HEAD..HEAD, also als leere Range. Der Changelog
# waere dann leer und der Lauf trotzdem gruen — dieselbe stille Falle wie der
# fehlende --match-Filter.
if [ -z "$LAST_TAG" ]; then
  echo "ABBRUCH: kein ${TAG_PREFIX}*-Tag gefunden." >&2
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

Im Modus `ota` wird **nicht** gebumpt — und dann ist auch in Schritt 7 nichts zu
committen. Beide Schritte hängen am selben Modus-Gate.

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
# Als Array bauen und mit env aufrufen. Eine per $( … ) eingesetzte Zuweisung waere
# KEINE Zuweisung: die Shell erkennt Zuweisungen vor der Expansion, das expandierte
# Wort wird zum KOMMANDONAMEN. Der Build scheitert dann mit
# "VITE_VAULT_URL=…: Datei oder Verzeichnis nicht gefunden".
BUILD_ENV=(
  VITE_BASE_PATH=/                     # Pflicht fuer Capacitor; die WoT-Demo
                                       # defaultet sonst auf /demo/ (GitHub Pages)
                                       # und zeigt ein Weissbild.
  VITE_RELAY_URL=wss://relay.web-of-trust.de
  VITE_PROFILE_SERVICE_URL=https://profiles.web-of-trust.de
  VITE_UPDATE_SERVER_URL="$UPDATE_SERVER"
  VITE_UPDATE_CHANNEL=android-foss
)
[ "$HAS_VAULT" = yes ] && BUILD_ENV+=(VITE_VAULT_URL=https://vault.web-of-trust.de)

cd "$APP_DIR"
env "${BUILD_ENV[@]}" pnpm "$BUILD_SCRIPT"
```

**Verifizieren, BEVOR signiert wird.**

```bash
set -euo pipefail
d="$APP_DIR/dist/assets"

# 1) Bekannte Altlasten duerfen NIE vorkommen.
for bad in utopia-lab relay.box; do
  if grep -rlq "$bad" $d/*.js; then
    echo "ABBRUCH: '$bad' im Bundle gefunden." >&2; exit 1
  fi
done

# 2) Das Produktions-Relay MUSS drin sein.
grep -rlqE "wss://relay\.web-of-trust\.de" $d/*.js || {
  echo "ABBRUCH: Produktions-Relay fehlt im Bundle." >&2; exit 1; }

# 3) JEDE ws/wss-URL gegen eine Allowlist, hart abbrechen. Hier ist die Liste kurz
#    und der Schaden bei einer falschen URL am groessten. Ein grep nur auf BEKANNTE
#    Hosts wuerde einen neuen, falschen Host gar nicht sehen — es prueft dann bloss,
#    was man ohnehin schon befuerchtet.
UNEXPECTED_WS=$(grep -rhoE "wss?://[^\"'\`[:space:]]+" $d/*.js | sort -u \
  | grep -vE '^wss://relay\.web-of-trust\.de' || true)
if [ -n "$UNEXPECTED_WS" ]; then
  echo "ABBRUCH: unerwartete WebSocket-URLs im Bundle:" >&2
  printf '  %s\n' $UNEXPECTED_WS >&2
  exit 1
fi

# 4) Alle HTTPS-Hosts auflisten. Hier bewusst KEIN harter Abbruch: Bundles enthalten
#    legitime Fremd-URLs (JSON-LD-Kontexte, Spec-Links). Aber ansehen ist Pflicht.
echo "--- HTTPS-Hosts im Bundle, bitte durchsehen ---"
grep -rhoE "https://[a-zA-Z0-9.-]+" $d/*.js | sed 's|https://||' | sort -u
```

### Schritt 6a: APK bauen (bei `apk` oder `full`)

**Signatur-Kette, je App unterschiedlich:**

- **wot**: Der fdroid-Flavor nutzt `signingConfig signingConfigs.debug`, Gradle baut also ein **debug-signiertes** `app-fdroid-release.apk` (NICHT `-unsigned`).
- **rls**: Kein Flavor, kein signingConfig, Gradle baut ein **unsigniertes** `app-release-unsigned.apk`.

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

# Gebautes APK waehlen — bewusst OHNE Pipe. Mit `set -o pipefail` ist jede Pipe
# hier eine Falle: bei rls heisst das EINZIGE APK "-unsigned", ein `grep -v` findet
# dann nichts und liefert Exit 1; und bei leerem Verzeichnis scheitert schon `ls`
# mit Exit 2. Beides braeche die Zuweisung ab, BEVOR der Fallback oder die
# Fehlermeldung greift — also genau in den Faellen, fuer die sie da sind.
shopt -s nullglob
APKS=("$APK_OUT"/*.apk)
shopt -u nullglob
[ ${#APKS[@]} -gt 0 ] || { echo "ABBRUCH: kein APK in $APK_OUT" >&2; exit 1; }

BUILT=""
for a in "${APKS[@]}"; do
  case "$a" in *-unsigned.apk) continue ;; esac
  BUILT="$a"; break
done
# rls: dort existiert NUR das unsignierte, dann ist es das richtige.
[ -n "$BUILT" ] || BUILT="${APKS[0]}"
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

**Vor dem Deploy:** Enthält das lokale `repo/` alle APKs, die auf dem Server liegen? Fehlt lokal eines, verschwindet diese Version beim Sync still aus dem Index. Fehlende erst herunterladen, dann `fdroid update` erneut laufen lassen.

### Schritt 6b: Play Store AAB bauen (optional, nur `wot`)

```bash
cd "$APP_DIR/android"
./gradlew bundlePlaystoreRelease
```

AAB: `app/build/outputs/bundle/playstoreRelease/app-playstore-release.aab`

Sage dem User den Pfad — Upload manuell über <https://play.google.com/console>

### Schritt 6c: OTA-Bundle (bei `ota` oder `full`)

GitHub Actions baut die Channel-Bundles bei **Push auf den Default-Branch**. Daraus
folgt etwas, das leicht untergeht: der `ota`-Modus loest von sich aus **nichts** aus.
Er bumpt keine Version (Schritt 4) und committet nichts (Schritt 7) — ohne einen Push
passiert also gar nichts, und der Lauf endet trotzdem zufrieden.

Deshalb im Modus `ota` ausdruecklich pruefen, ob die Aenderungen ueberhaupt draussen
sind, und den Bundle-Bau belegen statt anzunehmen:

```bash
set -euo pipefail
cd "$APP_REPO"
git fetch --quiet origin "$RELEASE_BRANCH"

# BEIDE Richtungen pruefen. Nur auf Unpubliziertes zu schauen reicht nicht: ein
# VERALTETER Checkout hat nichts Unpubliziertes und kaeme durch — man wuerde dann
# das OTA-Release eines ALTEN Commits bestaetigt bekommen, waehrend die
# tatsaechlich neuen Aenderungen gar kein Bundle haben.
# Bewusst hier ausgeschrieben statt assert_clean_at_origin aus Schritt 2
# aufzurufen: die Snippets laufen in getrennten Shells, eine dort definierte
# Funktion existiert hier nicht.
git fetch --quiet origin "$RELEASE_BRANCH" || {
  echo "ABBRUCH: konnte origin/$RELEASE_BRANCH nicht holen." >&2
  echo "Ohne frischen Stand ist der Vergleich wertlos." >&2
  exit 1; }

COUNTS=$(git rev-list --left-right --count "origin/$RELEASE_BRANCH...HEAD")
BEHIND=$(echo "$COUNTS" | cut -f1); AHEAD=$(echo "$COUNTS" | cut -f2)
if [ "$BEHIND" -ne 0 ] || [ "$AHEAD" -ne 0 ]; then
  echo "ABBRUCH: HEAD ist nicht identisch mit origin/$RELEASE_BRANCH." >&2
  echo "  $BEHIND Commits hinterher, $AHEAD voraus" >&2
  echo "Voraus  → erst mergen/pushen, sonst baut der Workflow kein Bundle." >&2
  echo "Hinterher → erst pullen, sonst prueft man ein Bundle von gestern." >&2
  exit 1
fi

HEAD_SHA=$(git rev-parse --short=7 HEAD)
echo "erwarte ein OTA-Release fuer $HEAD_SHA"
```

Danach belegen, dass der Workflow auch wirklich ein Bundle erzeugt hat. Die
OTA-Releases heissen `ota-<sha>`:

```bash
# $GH_REPO, nicht hart web-of-trust: die RLS-OTA-Releases liegen im
# real-life-stack-Repo (erzeugt von deploy-prototypes.yml).
gh release view "ota-${HEAD_SHA}" --repo "$GH_REPO" \
  --json tagName,createdAt --jq '"ok: \(.tagName) vom \(.createdAt[0:16])"' \
  || { echo "ABBRUCH: kein OTA-Release fuer $HEAD_SHA gefunden." >&2
       echo "Laeuft der Workflow noch, oder ist er fehlgeschlagen?" >&2; exit 1; }
```

### Schritt 7: Commit + Tag + Push (nur bei `apk` oder `full`)

**Im Modus `ota` diesen Schritt überspringen.** Dort wurde in Schritt 4 nichts
gebumpt, es gibt also nichts zu committen — die Stage-Prüfung unten würde
zwangsläufig fehlschlagen. Für `ota` gilt stattdessen Schritt 6c.

Der Ablauf ist bewusst in drei Phasen getrennt: **erst alles stagen und
validieren, dann committen, dann fragen, dann pushen.** Ein Push, der vor der
Freigabe passiert, ist keine Freigabe. Und bei `rls` darf die erste Hälfte erst
raus, wenn die zweite validiert ist — sonst veröffentlicht man genau den
Zwei-Repo-Split, den dieser Schritt verhindern soll.

**Phase 1 — stagen und validieren.**

```bash
set -euo pipefail
VERSION_NAME=$(grep VERSION_NAME "$VERSION_FILE" | cut -d= -f2)
VERSION_CODE=$(grep VERSION_CODE "$VERSION_FILE" | cut -d= -f2)

# Vergleicht den Stage-Inhalt eines Repos gegen die exakt erwartete Pfadliste.
# Nur anzeigen genuegt nicht: es belegt weder Vollstaendigkeit noch, dass nichts
# Fremdes mitgestaged wurde — git add laesst vorher gestagte Fremdaenderungen stehen.
# (`git status --cached` gibt es uebrigens nicht, das bricht mit Exit 128 ab.)
assert_staged() {
  repo=$1; shift
  expected=$(printf '%s\n' "$@" | sort)
  staged=$(git -C "$repo" diff --cached --name-only | sort)
  if [ "$staged" != "$expected" ]; then
    echo "ABBRUCH: unerwarteter Stage-Inhalt in $repo." >&2
    echo "--- erwartet ---" >&2; printf '%s\n' "$expected" >&2
    echo "--- gestaged ---" >&2; printf '%s\n' "$staged" >&2
    exit 1
  fi
}

if [ "$APP" = wot ]; then
  # Gezielt die eine YAML stagen, nicht das ganze metadata/-Verzeichnis: sonst
  # rutscht ein fremder Metadaten-Bump (z.B. der anderen App) mit in den Release.
  git -C "$APP_REPO" add "$VERSION_FILE" "$METADATA"
  assert_staged "$APP_REPO" "${VERSION_FILE#$APP_REPO/}" "${METADATA#$APP_REPO/}"
else
  # BEIDE Repos stagen und BEIDE validieren, bevor irgendetwas committet wird.
  git -C "$APP_REPO" add "$VERSION_FILE"
  assert_staged "$APP_REPO" "${VERSION_FILE#$APP_REPO/}"
  git -C "$WOT_REPO" add "$METADATA"
  assert_staged "$WOT_REPO" "${METADATA#$WOT_REPO/}"
fi
```

**Phase 2 — committen und taggen, noch nichts pushen.**

```bash
if [ "$APP" = wot ]; then
  git -C "$APP_REPO" commit -m "release: ${TAG_PREFIX}${VERSION_NAME}"
  git -C "$APP_REPO" tag "${TAG_PREFIX}${VERSION_NAME}"
else
  git -C "$APP_REPO" commit -m "release: Android App v${VERSION_NAME} (${VERSION_CODE})"
  git -C "$APP_REPO" tag "${TAG_PREFIX}${VERSION_NAME}"   # Tag gehoert NUR ins Quell-Repo
  git -C "$WOT_REPO" commit -m "fdroid: ${APP_ID} ${VERSION_NAME} (${VERSION_CODE})"
fi

# Zeigen, was gleich rausgehen wuerde.
git -C "$APP_REPO" --no-pager log --oneline -1
[ "$APP" = rls ] && git -C "$WOT_REPO" --no-pager log --oneline -1
```

**Phase 3 — Freigabe einholen, dann pushen.**

Frage den User jetzt, ob gepusht werden soll. Erst nach seinem Ja:

```bash
# Branch UND Tag in EINEM atomaren Push. `git push && git push --tags` sind zwei
# Operationen: gelingt die erste und scheitert die zweite, ist der Commit
# veroeffentlicht und der Tag fehlt — ein halber Release, den niemand als solchen
# erkennt. --atomic aktualisiert entweder alle Refs oder keinen.
TAG="${TAG_PREFIX}${VERSION_NAME}"

git -C "$APP_REPO" push --atomic origin \
  "HEAD:refs/heads/$RELEASE_BRANCH" "refs/tags/$TAG"

if [ "$APP" = rls ]; then
  # Zweites Repo, eigener Push. Ein `git push` im falschen Verzeichnis schiebt nur
  # eine Haelfte raus und laesst die andere lokal — genau der Split von oben.
  git -C "$WOT_REPO" push origin "HEAD:refs/heads/main"
fi
```

**Nach den Pushes verifizieren, dass beide Hälften draußen sind.** Bei `rls` kann
der erste Push gelingen und der zweite scheitern — dann ist der Split
veröffentlicht, und ohne Prüfung merkt es niemand:

```bash
verify_pushed() {
  repo=$1; branch=$2; label=$3
  git -C "$repo" fetch --quiet origin "$branch" || return 1
  [ -z "$(git -C "$repo" rev-list "origin/$branch..HEAD")" ] || {
    echo "NICHT GEPUSHT: $label" >&2; return 1; }
  echo "ok: $label ist auf origin/$branch"
}

verify_pushed "$APP_REPO" "$RELEASE_BRANCH" "Quelle"
if [ "$APP" = rls ]; then
  verify_pushed "$WOT_REPO" main "Metadaten" || {
    cat >&2 <<'"'"'RECOVERY'"'"'
ABBRUCH: Die Quelle ist veroeffentlicht, die Metadaten nicht.

Das ist der Zwei-Repo-Split. NICHT die Quelle zurueckrollen — Tag und Commit sind
bereits oeffentlich, ein force-push darauf ist schlimmer als der Split.

Richtig ist, die zweite Haelfte nachzuziehen:
  cd $WOT_REPO && git push
Der Metadaten-Commit liegt dort lokal bereit und ist idempotent.

Scheitert der Push dauerhaft (z.B. Hardware-Key), den Zustand ausdruecklich
benennen: die App-Version ist getaggt, aber im F-Droid-Index noch nicht sichtbar.
Bis zum Nachziehen KEIN fdroid update und KEIN Deploy — sonst behauptet der Index
eine Version, die kein Repo dokumentiert.
RECOVERY
    exit 1; }
fi
```

Bricht ein Push ab, bevor er stattgefunden hat, sind Commits und Tag noch lokal und
lassen sich korrigieren. Deshalb committen wir vorher und pushen erst am Ende.

Hinweis: schlägt ein Push mit `sign_and_send_pubkey: agent refused operation` fehl, klemmt der Hardware-Key. Dann über HTTPS pushen statt das SSH-Remote zu ändern.

### Schritt 8: F-Droid Repo deployen (nur bei `apk` oder `full`)

**Im Modus `ota` diesen Schritt überspringen.** Dort wurde kein APK gebaut und der
F-Droid-Index nicht angefasst — ein Deploy würde nur den unveränderten Stand erneut
hochladen und die Live-Prüfung unten liefe gegen eine Version, die dieser Lauf gar
nicht erzeugt hat.

Sage dem User: "Lade den Ordner `packages/wot-fdroid/fdroid/` per FileZilla auf den Server hoch."

Alternativ:

```bash
# NUR repo/ deployen. Der Server ist reines statisches Hosting — Keystore,
# config.yml (Passwort!), metadata/, tmp/ und srclibs/ haben dort nichts verloren.
# Bis zum 31.07.2026 wurde die ganze fdroid/-Mappe gesynct und lag im Web-Root,
# nur durch eine Caddy-Blocklist geschuetzt. Der Mount ist seitdem auf repo/
# verengt; dieser Pfad hier stellt sicher, dass es auch so bleibt.
rsync -av "$FDROID_DIR/fdroid/repo/" anton@85.215.34.19:/home/anton/docker-container/wot-fdroid/fdroid/repo/
```

Ohne diesen Schritt sehen die Nutzer weiterhin die Vorversion. Das ist schon passiert:
am 30.07.2026 stand das Live-Repo noch auf dem Stand vom 12. Juli, weil ein Upload nie
angekommen war.

**Deshalb hart gegenprüfen, statt nur zu schauen.** Der Check muss fehlschlagen, wenn
die neue Version nicht live ist:

```bash
# -f: HTTP-Fehler werden zu Exit != 0, statt eine Fehlerseite in python zu pipen
#     (das gaebe eine kryptische JSON-Meldung statt "Server antwortet 404").
# -S: Fehler trotzdem anzeigen. --max-time und --max-filesize begrenzen den Abruf.
curl -fsS --max-time 30 --max-filesize 20000000 \
  https://fdroid.utopia-lab.org/fdroid/repo/index-v1.json \
  | APP_ID="$APP_ID" WANT_N="$VERSION_NAME" WANT_C="$VERSION_CODE" python3 -c "
import json, os, sys
d = json.load(sys.stdin)
app, want_n, want_c = os.environ['APP_ID'], os.environ['WANT_N'], int(os.environ['WANT_C'])
pkgs = d.get('packages', {})
if app not in pkgs:
    sys.exit(f'ABBRUCH: {app} fehlt im Live-Index')
if not [v for v in pkgs[app] if v['versionCode'] == want_c and v['versionName'] == want_n]:
    have = sorted({(v['versionCode'], v['versionName']) for v in pkgs[app]}, reverse=True)
    sys.exit(f'ABBRUCH: {app} {want_n} ({want_c}) ist NICHT live. Vorhanden: {have}')
print(f'ok: {app} {want_n} ({want_c}) ist live')
"
```

Optional zusätzlich: das lokale APK gegen den Hash im Live-Index prüfen. Dann ist
belegt, dass die Nutzer exakt das signierte Artefakt bekommen.

### Schritt 9: Zusammenfassung

Zeige dem User:

- Welche App und welcher Modus
- Neue Version (wenn gebumpt)
- Was gebaut wurde (APK-Pfad, OTA-Tag)
- Bei `rls`: ausdrücklich, dass **zwei** Repos committet und gepusht wurden
- Ergebnis der Live-Index-Prüfung
- Nächste Schritte (ggf. Play Console)

## Changelog generieren

```bash
git log --oneline "$LAST_TAG"..HEAD -- "$APP_REL/" $BUNDLED | sed 's/^[a-f0-9]* /- /'
```

`$LAST_TAG` muss aus Schritt 3 stammen, also mit `--match "${TAG_PREFIX}[0-9]*"` ermittelt und auf Leere geprüft sein.
