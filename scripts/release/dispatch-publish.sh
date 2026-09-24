#!/usr/bin/env bash
# Welche publish.yml-Laeufe ein release-please-Durchgang anstossen muss.
#
# WARUM ALS EIGENE DATEI: diese Logik stand als Inline-Skript in
# .github/workflows/release-please.yml und war damit nur im Ernstfall pruefbar —
# also erst, wenn ein Release schon gelaufen war. Genau so blieb der
# Service-only-Fall unentdeckt (#378): `[ -n "$tag" ] || return` liefert unter
# `set -e` den Exit-Status des fehlgeschlagenen Tests, die erste uebersprungene
# Paketkategorie beendete deshalb den ganzen Job. Hier laesst sich jeder Fall
# trocken durchspielen, siehe test-dispatch-publish.mjs.
#
# Drei Arten von Releases, alle legitim:
#   - npm-Pakete (core, adapter-yjs, adapter-automerge) → publish.yml je Tag
#   - die App (eigene Komponente, Tag app-v*)           → eigener Job, nicht hier
#   - die Dienste (relay, vault, profiles)              → nur Docker, kein npm
# Ein Durchgang kann jede Teilmenge davon enthalten, auch nur Dienste.
#
# Abgebrochen wird bei genau zwei Dingen, beides echte Stoerungen:
#   1. Ein Paket meldet released=true, hat aber keinen Tag-Output.
#   2. Es wurde gar nichts erkannt — kein Paket, keine App, kein Dienst.
#      Das ist der Schema-Drift-Waechter: aendert release-please seine
#      Output-Namen, laufen sonst alle Releases still ins Leere.
#
# DISPATCH_DRY_RUN=1 druckt die Aufrufe, statt sie auszufuehren (Tests).
set -euo pipefail

started=0
missing=0

# Ein Paket anstossen — oder bewusst ueberspringen. Gibt IMMER 0 zurueck, ein
# uebersprungenes Paket ist kein Fehler; echte Fehler laufen ueber `missing`.
dispatch() {
  local released=$1 tag=$2 label=$3
  # Der Guard muss PRO PAKET greifen. Nur zu pruefen, ob am Ende ueberhaupt ein
  # Tag dabei war, uebersieht den Fall "core wurde released, aber sein
  # Tag-Output fehlt" — dann wuerde core still nicht publiziert, waehrend die
  # anderen beiden durchlaufen und der Job gruen bleibt.
  if [ "$released" = "true" ] && [ -z "$tag" ]; then
    echo "ABBRUCH-Kandidat: $label als released gemeldet, aber kein Tag-Output." >&2
    missing=1
    return 0
  fi
  if [ -z "$tag" ]; then
    echo "uebersprungen: $label (in diesem Durchgang nicht released)"
    return 0
  fi
  echo "starte publish.yml für $tag"
  if [ "${DISPATCH_DRY_RUN:-}" = "1" ]; then
    echo "DRY-RUN: gh workflow run publish.yml -f tag=$tag"
  else
    gh workflow run publish.yml --repo "$GITHUB_REPOSITORY" -f tag="$tag"
  fi
  started=$((started + 1))
  return 0
}

dispatch "${CORE_RELEASED:-}"      "${CORE_TAG:-}"      "wot-core"
dispatch "${YJS_RELEASED:-}"       "${YJS_TAG:-}"       "adapter-yjs"
dispatch "${AUTOMERGE_RELEASED:-}" "${AUTOMERGE_TAG:-}" "adapter-automerge"

if [ "$missing" -eq 1 ]; then
  echo "ABBRUCH: mindestens ein released-Paket ohne Tag-Output." >&2
  echo "Vermutlich hat sich das Output-Schema von release-please geaendert." >&2
  exit 1
fi

# started=0 ist ein REGULAERER Fall, sobald nachweislich etwas anderes released
# wurde: die App (eigene Komponente, kein npm-Publish ueber publish.yml) oder
# einer der drei Dienste (die gehen nur als Docker-Image raus). Frueher zaehlte
# nur die App, und ein Service-only-Release wurde als fehlende Release-Erkennung
# abgelehnt (#378). Den Waechter ersatzlos zu streichen waere aber zu viel des
# Guten: dann bliebe echte Output-/Schema-Drift still gruen, und kein Paket
# wuerde je publiziert, ohne dass es jemand merkt.
other_released=""
for flag in "${APP_RELEASED:-}" "${RELAY_RELEASED:-}" "${VAULT_RELEASED:-}" "${PROFILES_RELEASED:-}"; do
  [ "$flag" = "true" ] && other_released="ja"
done

if [ "$started" -eq 0 ] && [ -z "$other_released" ]; then
  echo "ABBRUCH: releases_created=true, aber weder ein Paket-, App- noch Dienst-Release erkannt." >&2
  echo "Vermutlich hat sich das Output-Schema von release-please geaendert." >&2
  exit 1
fi

echo "$started Publish-Lauf/Laeufe angestossen"
