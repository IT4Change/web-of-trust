#!/usr/bin/env node
// Faelle des Publish-Dispatchers (scripts/release/dispatch-publish.sh).
//
// WARUM ES DEN GIBT: die Logik stand als Inline-Skript im Workflow und war
// damit erst im Ernstfall pruefbar. Der Service-only-Release #377 lief deshalb
// in einen Abbruch, den niemand vorher sehen konnte (#378). Hier laeuft jeder
// Fall trocken: das Skript dispatcht nichts, es druckt nur, was es taete.
//
// Schwester: test-release-cascade.mjs prueft den Kaskaden-VERTRAG (welche
// Releases release-please ueberhaupt erzeugt), dieser hier die REAKTION darauf.
//
// Aufruf:  node scripts/release/test-dispatch-publish.mjs
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(HERE, 'dispatch-publish.sh')

let failed = 0
const ok = (msg) => console.log(`  ok   ${msg}`)
const fail = (msg, detail = '') => { console.log(`  FAIL ${msg}${detail ? ` — ${detail}` : ''}`); failed++ }

/** Das Skript trocken laufen lassen; liefert { code, out }. */
function run(env) {
  try {
    const out = execFileSync('bash', [SCRIPT], {
      encoding: 'utf8',
      env: { ...process.env, DISPATCH_DRY_RUN: '1', GITHUB_REPOSITORY: 'real-life-org/web-of-trust', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, out }
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

/** Welche Tags haette das Skript angestossen? */
const dispatched = (out) => [...out.matchAll(/DRY-RUN: gh workflow run publish\.yml -f tag=(\S+)/g)].map((m) => m[1])

function check(name, env, { code: wantCode, tags: wantTags }) {
  const { code, out } = run(env)
  if (code !== wantCode) return fail(name, `Exit ${code}, erwartet ${wantCode}\n${out}`)
  const got = dispatched(out)
  if (wantTags !== undefined && JSON.stringify(got) !== JSON.stringify(wantTags)) {
    return fail(name, `angestossen ${JSON.stringify(got)}, erwartet ${JSON.stringify(wantTags)}`)
  }
  ok(name)
}

console.log('== Regulaere Releases ==')

// Der Fall aus #377/#378: nur relay/vault/profiles, alle npm-Tags leer. Vorher
// starb das Skript an der ERSTEN uebersprungenen Kategorie.
check('Service-only: kein Publish, gruen', { RELAY_RELEASED: 'true' }, { code: 0, tags: [] })
check('Service-only (alle drei Dienste)',
  { RELAY_RELEASED: 'true', VAULT_RELEASED: 'true', PROFILES_RELEASED: 'true' }, { code: 0, tags: [] })

check('App-only: kein Publish, gruen', { APP_RELEASED: 'true' }, { code: 0, tags: [] })

check('nur core', { CORE_RELEASED: 'true', CORE_TAG: 'wot-core-v0.5.10' },
  { code: 0, tags: ['wot-core-v0.5.10'] })

// Teilmenge: der haeufige Fall, dass ein Adapter ohne core mitgeht.
check('nur adapter-yjs', { YJS_RELEASED: 'true', YJS_TAG: 'adapter-yjs-v0.2.10' },
  { code: 0, tags: ['adapter-yjs-v0.2.10'] })

check('alle drei npm-Pakete', {
  CORE_RELEASED: 'true', CORE_TAG: 'wot-core-v0.5.10',
  YJS_RELEASED: 'true', YJS_TAG: 'adapter-yjs-v0.2.10',
  AUTOMERGE_RELEASED: 'true', AUTOMERGE_TAG: 'adapter-automerge-v0.2.10',
}, { code: 0, tags: ['wot-core-v0.5.10', 'adapter-yjs-v0.2.10', 'adapter-automerge-v0.2.10'] })

check('gemischt: Paket + App + Dienst', {
  CORE_RELEASED: 'true', CORE_TAG: 'wot-core-v0.5.10',
  APP_RELEASED: 'true', RELAY_RELEASED: 'true',
}, { code: 0, tags: ['wot-core-v0.5.10'] })

console.log('== Stoerungen, die abbrechen MUESSEN ==')

// Der Guard pro Paket: released, aber kein Tag. Das darf nicht still
// durchlaufen, sonst wird ein Paket nie publiziert und der Job bleibt gruen.
check('released ohne Tag-Output bricht ab', { CORE_RELEASED: 'true', CORE_TAG: '' }, { code: 1 })

check('released ohne Tag bricht auch neben einem gesunden Paket ab', {
  CORE_RELEASED: 'true', CORE_TAG: '',
  YJS_RELEASED: 'true', YJS_TAG: 'adapter-yjs-v0.2.10',
}, { code: 1 })

// Schema-Drift: release-please benennt seine Outputs um, alles ist leer.
// Ohne diesen Waechter liefe jedes Release still ins Leere.
check('gar nichts erkannt bricht ab (Schema-Drift)', {}, { code: 1 })

console.log(failed === 0 ? '\nalle Faelle ok' : `\n${failed} Fall/Faelle fehlgeschlagen`)
process.exit(failed === 0 ? 0 : 1)
