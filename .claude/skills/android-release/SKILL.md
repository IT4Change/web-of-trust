---
description: Signiert und veröffentlicht ein Android-Release einer der beiden Apps (WoT Demo / RLS Reference). Bumpt die Version, taggt, laesst CI bauen, signiert das CI-Artefakt mit dem F-Droid-Key und deployt. Nutze diesen Skill fuer ein neues App-Release.
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep]
---

# Android Release (Sign & Deploy)

**Rolle dieses Skills:** die menschliche Brücke zwischen dem automatischen
Build und der Auslieferung. Gebaut wird nicht mehr hier — der `build-on-tag`-
Workflow in beiden App-Repos baut das APK reproduzierbar vom Tag
(`scripts/release/build-android.sh`). Dieser Skill **bumpt und taggt vorne**,
**zieht das CI-Artefakt**, **signiert es mit dem F-Droid-Schlüssel** (der bewusst
nur lokal liegt) und **deployt**. Die Build-Logik lebt an genau einer getesteten
Stelle; sie hier zu duplizieren wäre garantierte Drift.

> Übergangszustand. Version-Bump/Tag wandern mit Phase 2 zu release-please,
> Signierung und Deploy zum `wot-release`-Runner. Dann schrumpft dieser Skill auf
> „Release-PR mergen, fertig". Bis dahin ist das hier der Weg.

**Zwei Apps:** `wot` (Web of Trust Demo) · `rls` (Real Life Stack Reference).
**Modus** dieses Skills ist immer APK/Release. Reine Web-Änderungen (OTA) laufen
über den Push auf den Default-Branch, nicht hier.

## Voraussetzungen

```bash
command -v keytool && command -v apksigner   # JDK-Tools zum Signieren/Verifizieren
command -v fdroid                            # Index-Bau (pip install fdroidserver)
command -v gh                                # CI-Artefakt ziehen
```

Node/pnpm/Gradle braucht dieser Skill **nicht** — das ist CI-Sache. Fehlt ein
JDK-Tool, lässt sich der Ablauf nicht sinnvoll teilen: ohne Signierung kein
Release. Dann auf einer Umgebung mit JDK fortsetzen.

## Ablauf

### Schritt 1: App bestimmen

- `wot`, `demo`, `web-of-trust` → **wot** · `rls`, `stack`, `reference` → **rls**
- Optional eine Versionsnummer wie `0.2.2`, sonst Auto-Increment.

**Ohne erkennbare App: nachfragen, nicht raten.** Das falsche Profil signiert ein
falsches Binary unter fremdem Paketnamen.

### Schritt 2: App-Profil setzen

Alle Unterschiede stehen ausschließlich hier.

```bash
# Das F-Droid-Repo liegt IMMER im web-of-trust-Repo — auch fuer die RLS-App.
WOT_REPO=~/workspace/workspace/web-of-trust
FDROID_DIR="$WOT_REPO/packages/wot-fdroid"

case "$APP" in
  wot)
    APP_REPO="$WOT_REPO"
    APP_DIR="$APP_REPO/apps/demo"
    APP_ID=org.reallife.weboftrust
    RELEASE_BRANCH=main
    GH_REPO=real-life-org/web-of-trust
    ;;
  rls)
    # Kanonischer Checkout, NICHT ein persoenlicher Worktree. Wer aus einem
    # Worktree released, setzt APP_REPO bewusst um.
    APP_REPO=~/workspace/workspace/real-life-stack
    APP_DIR="$APP_REPO/apps/reference"
    APP_ID=org.reallife.reallifestack
    RELEASE_BRANCH=master
    GH_REPO=real-life-org/real-life-stack
    ;;
esac

TAG_PREFIX=app-v                 # beide Apps taggen einheitlich app-v* (seit
                                 # 31.07.2026). Alt-Tags v0.2.1..v0.2.7 sind
                                 # Historie.
METADATA="$FDROID_DIR/fdroid/metadata/${APP_ID}.yml"
VERSION_FILE="$APP_DIR/android/version.properties"

# Den Checkout VALIDIEREN, nicht nur anzeigen. Fail-closed: JEDER Teilschritt
# bricht ab, auch ein fehlgeschlagenes fetch — ohne frischen origin-Stand
# vergleicht man gegen eine veraltete Referenz und die Pruefung geht faelschlich
# durch. Am 30.07.2026 stand real-life-stack auf einem Feature-Branch mit 20
# uncommitteten Dateien; ein `git status`, dessen Ausgabe niemand auswertet,
# haette daraus gebaut.
set -euo pipefail
assert_clean_at_origin() {
  repo=$1; branch=$2; label=$3
  git -C "$repo" fetch --quiet origin "$branch" || {
    echo "ABBRUCH: konnte origin/$branch in $label nicht holen." >&2; return 1; }
  dirty=$(git -C "$repo" status --porcelain)
  if [ -n "$dirty" ]; then
    echo "ABBRUCH: $label ist nicht sauber:" >&2; printf '%s\n' "$dirty" >&2; return 1
  fi
  br=$(git -C "$repo" rev-parse --abbrev-ref HEAD)
  counts=$(git -C "$repo" rev-list --left-right --count "origin/$branch...HEAD") || {
    echo "ABBRUCH: origin/$branch existiert nicht in $label." >&2; return 1; }
  behind=$(echo "$counts" | cut -f1); ahead=$(echo "$counts" | cut -f2)
  if [ "$br" != "$branch" ] || [ "$behind" -ne 0 ] || [ "$ahead" -ne 0 ]; then
    echo "ABBRUCH: $label steht nicht exakt auf origin/$branch." >&2
    echo "  Branch: $br (erwartet: $branch), $behind hinterher, $ahead voraus" >&2
    return 1
  fi
  echo "ok: $label == origin/$branch, sauber"
}

assert_clean_at_origin "$APP_REPO" "$RELEASE_BRANCH" "$APP_REPO"
# Bei rls MUSS auch das WoT-Repo geprueft werden — dort landen die Metadaten.
if [ "$APP" = rls ]; then
  assert_clean_at_origin "$WOT_REPO" main "$WOT_REPO (Metadaten)"
fi
```

**Die wichtigste Asymmetrie:** Bei `rls` liegt `version.properties` im
**real-life-stack**-Repo, die F-Droid-Metadaten aber im **web-of-trust**-Repo. Ein
RLS-Release braucht deshalb **zwei Commits in zwei Repos**. Bei `wot` liegen beide
im selben Repo, dort ist es ein Commit.

### Schritt 3: Version bumpen

Bump-Logik (wenn keine Version angegeben): Patch `0.1.0` → `0.1.1`, VERSION_CODE +1.

```bash
cat "$VERSION_FILE"
```

Aktualisiere **beide** Stellen:

1. `$VERSION_FILE` — VERSION_CODE und VERSION_NAME
2. `$METADATA` — CurrentVersion und CurrentVersionCode

Zeige dem User die neue Version und frage, ob sie passt. Danach:

```bash
VERSION_NAME=$(grep VERSION_NAME "$VERSION_FILE" | cut -d= -f2)
VERSION_CODE=$(grep VERSION_CODE "$VERSION_FILE" | cut -d= -f2)
TAG="${TAG_PREFIX}${VERSION_NAME}"
```

### Schritt 4: Commit, Tag, Push (löst den CI-Build aus)

Drei Phasen: **stagen und validieren → committen und taggen → Freigabe → pushen.**
Ein Push vor der Freigabe ist keine Freigabe. Bei `rls` darf die erste Repo-Hälfte
erst raus, wenn die zweite validiert ist — sonst veröffentlicht man den
Zwei-Repo-Split.

```bash
# Vergleicht den Stage-Inhalt gegen die exakt erwartete Pfadliste. Nur anzeigen
# genuegt nicht: git add laesst vorher gestagte Fremdaenderungen stehen.
# (`git status --cached` gibt es nicht, das bricht mit Exit 128 ab.)
assert_staged() {
  repo=$1; shift
  expected=$(printf '%s\n' "$@" | sort)
  staged=$(git -C "$repo" diff --cached --name-only | sort)
  if [ "$staged" != "$expected" ]; then
    echo "ABBRUCH: unerwarteter Stage-Inhalt in $repo." >&2
    echo "--- erwartet ---" >&2; printf '%s\n' "$expected" >&2
    echo "--- gestaged ---" >&2; printf '%s\n' "$staged" >&2
    return 1
  fi
}

if [ "$APP" = wot ]; then
  git -C "$APP_REPO" add "$VERSION_FILE" "$METADATA"
  assert_staged "$APP_REPO" "${VERSION_FILE#$APP_REPO/}" "${METADATA#$APP_REPO/}"
  git -C "$APP_REPO" commit -m "release: $TAG"
  git -C "$APP_REPO" tag "$TAG"
else
  git -C "$APP_REPO" add "$VERSION_FILE"
  assert_staged "$APP_REPO" "${VERSION_FILE#$APP_REPO/}"
  git -C "$WOT_REPO" add "$METADATA"
  assert_staged "$WOT_REPO" "${METADATA#$WOT_REPO/}"
  git -C "$APP_REPO" commit -m "release: Android App v${VERSION_NAME} (${VERSION_CODE})"
  git -C "$APP_REPO" tag "$TAG"
  git -C "$WOT_REPO" commit -m "fdroid: ${APP_ID} ${VERSION_NAME} (${VERSION_CODE})"
fi

git -C "$APP_REPO" --no-pager log --oneline -1
[ "$APP" = rls ] && git -C "$WOT_REPO" --no-pager log --oneline -1 || true
```

**Frage den User jetzt, ob gepusht werden soll.** Erst nach seinem Ja:

```bash
# Branch UND Tag in EINEM atomaren Push: `git push && git push --tags` sind zwei
# Operationen; gelingt die erste und scheitert die zweite, ist der Commit
# veroeffentlicht und der Tag fehlt — ein halber Release.
git -C "$APP_REPO" push --atomic origin "HEAD:refs/heads/$RELEASE_BRANCH" "refs/tags/$TAG"
if [ "$APP" = rls ]; then
  git -C "$WOT_REPO" push origin "HEAD:refs/heads/main"
  # Beide Haelften draussen? Sonst ist der Split veroeffentlicht.
  git -C "$WOT_REPO" fetch --quiet origin main
  [ -z "$(git -C "$WOT_REPO" rev-list origin/main..HEAD)" ] || {
    echo "ABBRUCH: Quelle ist gepusht, Metadaten NICHT." >&2
    echo "Zweite Haelfte nachziehen (cd $WOT_REPO && git push) — NICHT die Quelle" >&2
    echo "zurueckrollen (Tag ist oeffentlich). Bis dahin KEIN fdroid update/Deploy." >&2
    exit 1; }
fi
```

Hinweis: schlägt ein Push mit `sign_and_send_pubkey: agent refused operation`
fehl, klemmt der Hardware-Key. Dann über HTTPS pushen statt das SSH-Remote zu
ändern.

### Schritt 5: CI bauen lassen und Artefakt ziehen

Der Tag-Push triggert `build-on-tag`. **Nicht lokal bauen** — das Artefakt, das
die Nutzer bekommen, soll exakt das sein, was CI reproduzierbar gebaut hat.

```bash
# Auf den Lauf warten und das Artefakt herunterladen.
gh run watch --repo "$GH_REPO" \
  "$(gh run list --repo "$GH_REPO" --workflow build-on-tag.yml \
       --branch "$TAG" --limit 1 --json databaseId --jq '.[0].databaseId')" \
  --exit-status

DL=$(mktemp -d)
gh run download --repo "$GH_REPO" \
  "$(gh run list --repo "$GH_REPO" --workflow build-on-tag.yml \
       --branch "$TAG" --limit 1 --json databaseId --jq '.[0].databaseId')" \
  --name "android-$TAG" --dir "$DL"

# Provenienz pruefen, BEVOR signiert wird: (a) die SHA256SUMS aus CI stimmen mit
# den Dateien, (b) build-info.json beschreibt genau diesen Tag und VersionCode.
( cd "$DL" && sha256sum -c SHA256SUMS )
node -e '
const fs=require("fs"), p=process.argv[1];
const bi=JSON.parse(fs.readFileSync(p+"/build-info.json","utf8"));
const [,,tag,code]=process.argv;
if (bi.tag!==tag)         throw new Error(`build-info.tag ${bi.tag} != ${tag}`);
if (String(bi.versionCode)!==code) throw new Error(`versionCode ${bi.versionCode} != ${code}`);
if (bi.signed)            throw new Error("Artefakt behauptet, signiert zu sein");
console.log(`Artefakt ok: ${bi.tag} (Code ${bi.versionCode}), unsigniert`);
' "$DL" "$TAG" "$VERSION_CODE"

CI_APK=$(ls "$DL"/*.apk | head -1)
echo "CI-APK: $CI_APK"
```

### Schritt 6: Signieren mit dem F-Droid-Key

`apksigner` ersetzt die vorhandene (Debug-)Signatur des CI-Artefakts durch die
F-Droid-Signatur. Der Fingerprint MUSS exakt dem Repo-Schlüssel entsprechen —
sonst schlägt das Update über die vorige Version bei allen Nutzern fehl.

Der Keystore liegt **nicht** mehr im F-Droid-Ordner (seit 31.07.2026 unter
`~/secrets/wot-fdroid/`, ausserhalb jedes Mounts).

```bash
cd "$FDROID_DIR/fdroid"
SECRETS=~/secrets/wot-fdroid
KEYSTORE="$SECRETS/keystore.p12"
# Passwort per sed, NICHT awk '{print $2}': wird dieser Skill mit Argumenten
# aufgerufen, ersetzt der Harness $1/$2/... im Snippet — das Passwort waere Muell.
PASS=$(sed -n 's/^keystorepass:[[:space:]]*//p' "$SECRETS/config.yml")
ALIAS=$(keytool -list -keystore "$KEYSTORE" -storetype PKCS12 -storepass "$PASS" 2>/dev/null | grep PrivateKeyEntry | cut -d, -f1)

export PATH="$HOME/Android/Sdk/build-tools/36.0.0:$PATH"
apksigner sign \
  --ks "$KEYSTORE" --ks-key-alias "$ALIAS" \
  --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out "repo/${APP_ID}_${VERSION_CODE}.apk" "$CI_APK"

# Fingerprint VERGLEICHEN und abbrechen — ein blosses `| grep SHA-256` zeigt nur
# an und akzeptiert jeden Schluessel.
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

### Schritt 7: F-Droid-Index bauen

```bash
cd "$FDROID_DIR/fdroid"
```

**Vor `fdroid update`: enthält das lokale `repo/` alle APKs, die auf dem Server
liegen?** Fehlt lokal eines, verschwindet diese Version beim Sync still aus dem
Index. Das ist real passiert (0.2.0 wäre am 30.07. fast rausgefallen).

```bash
SERVER=anton@85.215.34.19
SERVER_REPO=/home/anton/docker-container/wot-fdroid/fdroid/repo
missing=$(comm -23 \
  <(ssh "$SERVER" "ls $SERVER_REPO/*.apk 2>/dev/null | xargs -n1 basename | sort") \
  <(ls repo/*.apk | xargs -n1 basename | sort))
if [ -n "$missing" ]; then
  echo "Diese APKs liegen auf dem Server, aber nicht lokal — erst holen:" >&2
  printf '  %s\n' $missing >&2
  for f in $missing; do scp "$SERVER:$SERVER_REPO/$f" repo/; done
fi

fdroid update
```

### Schritt 8: Deployen und live gegenprüfen

**Nur `repo/` deployen.** Keystore, `config.yml`, `metadata/` liegen bewusst
außerhalb des Web-Mounts; die ganze Mappe zu syncen würde sie wieder ins Web-Root
tragen (bis 31.07.2026 genau so gewesen).

```bash
rsync -av "$FDROID_DIR/fdroid/repo/" \
  anton@85.215.34.19:/home/anton/docker-container/wot-fdroid/fdroid/repo/
```

**Hart gegenprüfen**, dass die neue Version wirklich live ist — der Check MUSS
fehlschlagen, wenn nicht (am 30.07. stand das Live-Repo unbemerkt auf dem Stand
vom 12. Juli):

```bash
curl -fsS --max-time 30 --max-filesize 20000000 \
  https://fdroid.utopia-lab.org/fdroid/repo/index-v1.json \
  | APP_ID="$APP_ID" WANT_N="$VERSION_NAME" WANT_C="$VERSION_CODE" python3 -c '
import json, os, sys
d = json.load(sys.stdin)
app, wn, wc = os.environ["APP_ID"], os.environ["WANT_N"], int(os.environ["WANT_C"])
pkgs = d.get("packages", {})
if app not in pkgs: sys.exit(f"ABBRUCH: {app} fehlt im Live-Index")
if not [v for v in pkgs[app] if v["versionCode"]==wc and v["versionName"]==wn]:
    have = sorted({(v["versionCode"], v["versionName"]) for v in pkgs[app]}, reverse=True)
    sys.exit(f"ABBRUCH: {app} {wn} ({wc}) ist NICHT live. Vorhanden: {have}")
print(f"live: {app} {wn} ({wc})")
'
```

### Schritt 9: GitHub-Release-Asset

Ans GitHub-Release des App-Tags gehört **das signierte APK** (für Obtainium) —
NICHT das unsignierte CI-Artefakt, sonst installieren Nutzer eine Signatur, von
der sie nie wieder updaten können.

```bash
gh release create "$TAG" --repo "$GH_REPO" --title "$TAG" --generate-notes \
  "$FDROID_DIR/fdroid/repo/${APP_ID}_${VERSION_CODE}.apk" \
  || gh release upload "$TAG" --repo "$GH_REPO" --clobber \
       "$FDROID_DIR/fdroid/repo/${APP_ID}_${VERSION_CODE}.apk"
```

### Schritt 10: Zusammenfassung

- Welche App, welche Version
- Bei `rls`: ausdrücklich, dass **zwei** Repos committet und gepusht wurden
- Ergebnis der Live-Index-Prüfung
- Play-AAB (noch nicht in CI): bis Phase 3 lokal via `./gradlew bundlePlaystoreRelease`
  im `$APP_DIR/android`, dann manuell in die Play Console. Bewusst getrennt vom
  reproduzierbaren F-Droid-Pfad.
