/**
 * CRDT Benchmark — Automerge vs Yjs
 *
 * Measures performance across synthetic scenarios to provide hard data
 * for the CRDT decision. Run with: npx vitest run tests/CrdtBenchmark.test.ts
 */
import { describe, it, expect, afterEach } from 'vitest'
import * as Y from 'yjs'
import * as Automerge from '@automerge/automerge'

// --- Test Data Generators ---

function generateContact(i: number) {
  return {
    did: `did:key:z6Mkcontact${i}`,
    publicKey: `pubkey-${i}-${'x'.repeat(40)}`,
    name: `Contact ${i}`,
    avatar: i % 3 === 0 ? `https://avatar.example.com/user-${i}.png` : '',
    bio: `Bio for contact ${i} — involved in project ${i % 10}`,
    status: i % 5 === 0 ? 'pending' : 'active',
    verifiedAt: i % 5 === 0 ? '' : new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function generateAttestation(i: number) {
  return {
    id: `att-${i}`,
    attestationId: `attestation-id-${i}`,
    fromDid: `did:key:attester-${i % 20}`,
    toDid: 'did:key:z6MkmyDid',
    claim: `Attestation claim #${i}: ${['JavaScript', 'Rust', 'Design', 'Leadership', 'Cooking', 'Teaching', 'Mentoring', 'Research'][i % 8]}`,
    tagsJson: JSON.stringify([['dev', 'rust', 'design', 'lead', 'food', 'teach', 'mentor', 'research'][i % 8]]),
    context: ['work', 'community', 'personal'][i % 3],
    createdAt: new Date().toISOString(),
    proofJson: JSON.stringify({ type: 'ed25519', sig: `sig-${'a'.repeat(64)}` }),
  }
}

// --- Automerge Helpers ---

interface AutomergeDoc {
  profile: Record<string, string> | null
  contacts: Record<string, Record<string, string>>
  attestations: Record<string, Record<string, string>>
}

function createAutomergeDoc(contactCount: number, attestationCount: number): Uint8Array {
  let doc = Automerge.from<AutomergeDoc>({
    profile: {
      did: 'did:key:z6MkmyDid',
      name: 'Benchmark User',
      bio: 'Testing CRDT performance',
      avatar: '',
      offersJson: '[]',
      needsJson: '[]',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    contacts: {},
    attestations: {},
  })

  doc = Automerge.change(doc, d => {
    for (let i = 0; i < contactCount; i++) {
      const c = generateContact(i)
      d.contacts[c.did] = c as any
    }
    for (let i = 0; i < attestationCount; i++) {
      const a = generateAttestation(i)
      d.attestations[a.id] = a as any
    }
  })

  return Automerge.save(doc)
}

// --- Yjs Helpers ---

function createYjsDoc(contactCount: number, attestationCount: number): Uint8Array {
  const ydoc = new Y.Doc()
  const profileMap = ydoc.getMap('profile')
  const contactsMap = ydoc.getMap('contacts')
  const attestationsMap = ydoc.getMap('attestations')

  ydoc.transact(() => {
    profileMap.set('did', 'did:key:z6MkmyDid')
    profileMap.set('name', 'Benchmark User')
    profileMap.set('bio', 'Testing CRDT performance')
    profileMap.set('avatar', '')
    profileMap.set('offersJson', '[]')
    profileMap.set('needsJson', '[]')
    profileMap.set('createdAt', new Date().toISOString())
    profileMap.set('updatedAt', new Date().toISOString())

    for (let i = 0; i < contactCount; i++) {
      const c = generateContact(i)
      const cm = new Y.Map()
      for (const [k, v] of Object.entries(c)) cm.set(k, v)
      contactsMap.set(c.did, cm)
    }

    for (let i = 0; i < attestationCount; i++) {
      const a = generateAttestation(i)
      const am = new Y.Map()
      for (const [k, v] of Object.entries(a)) am.set(k, v)
      attestationsMap.set(a.id, am)
    }
  })

  const update = Y.encodeStateAsUpdate(ydoc)
  ydoc.destroy()
  return update
}

// --- Benchmark Results ---

interface BenchmarkResult {
  scenario: string
  crdt: 'automerge' | 'yjs'
  snapshotSize: number
  initTimeMs: number
  singleMutationMs: number
  batchMutationMs: number
  serializeMs: number
}

const results: BenchmarkResult[] = []

afterEach(() => {
  // Print results after each scenario
})

function logResult(r: BenchmarkResult) {
  results.push(r)
  console.log(
    `[benchmark] ${r.crdt.padEnd(9)} | ${r.scenario.padEnd(20)} | ` +
    `init=${String(r.initTimeMs).padStart(5)}ms | ` +
    `mutate1=${String(r.singleMutationMs).padStart(4)}ms | ` +
    `mutate100=${String(r.batchMutationMs).padStart(4)}ms | ` +
    `serialize=${String(r.serializeMs).padStart(4)}ms | ` +
    `size=${String(r.snapshotSize).padStart(7)}B`
  )
}

// --- Scenarios ---

const SCENARIOS = [
  { name: 'small', contacts: 10, attestations: 5 },
  { name: 'medium', contacts: 100, attestations: 50 },
  { name: 'large', contacts: 500, attestations: 1000 },
]

describe('CRDT Benchmark', () => {
  for (const scenario of SCENARIOS) {
    describe(`${scenario.name} (${scenario.contacts} contacts, ${scenario.attestations} attestations)`, () => {

      it(`Automerge — ${scenario.name}`, () => {
        // 1. Create snapshot
        const binary = createAutomergeDoc(scenario.contacts, scenario.attestations)

        // 2. Init (load from binary)
        const t0init = performance.now()
        const doc = Automerge.load<AutomergeDoc>(binary)
        const initMs = Math.round(performance.now() - t0init)

        // Verify data loaded correctly
        expect(Object.keys(doc.contacts)).toHaveLength(scenario.contacts)
        expect(Object.keys(doc.attestations)).toHaveLength(scenario.attestations)

        // 3. Single mutation
        const t0single = performance.now()
        const doc2 = Automerge.change(doc, d => {
          d.contacts['did:key:z6Mknew'] = generateContact(9999) as any
        })
        const singleMs = Math.round(performance.now() - t0single)

        // 4. Batch mutation (100 contacts)
        const t0batch = performance.now()
        Automerge.change(doc2, d => {
          for (let i = 0; i < 100; i++) {
            d.contacts[`did:key:z6Mkbatch${i}`] = generateContact(10000 + i) as any
          }
        })
        const batchMs = Math.round(performance.now() - t0batch)

        // 5. Serialize
        const t0ser = performance.now()
        const saved = Automerge.save(doc)
        const serMs = Math.round(performance.now() - t0ser)

        logResult({
          scenario: scenario.name,
          crdt: 'automerge',
          snapshotSize: saved.length,
          initTimeMs: initMs,
          singleMutationMs: singleMs,
          batchMutationMs: batchMs,
          serializeMs: serMs,
        })
      })

      it(`Yjs — ${scenario.name}`, () => {
        // 1. Create snapshot
        const binary = createYjsDoc(scenario.contacts, scenario.attestations)

        // 2. Init (load from binary)
        const t0init = performance.now()
        const ydoc = new Y.Doc()
        Y.applyUpdate(ydoc, binary)
        const initMs = Math.round(performance.now() - t0init)

        const contactsMap = ydoc.getMap('contacts')
        const attestationsMap = ydoc.getMap('attestations')

        // Verify data loaded correctly
        expect(contactsMap.size).toBe(scenario.contacts)
        expect(attestationsMap.size).toBe(scenario.attestations)

        // 3. Single mutation
        const t0single = performance.now()
        ydoc.transact(() => {
          const cm = new Y.Map()
          const c = generateContact(9999)
          for (const [k, v] of Object.entries(c)) cm.set(k, v)
          contactsMap.set('did:key:z6Mknew', cm)
        })
        const singleMs = Math.round(performance.now() - t0single)

        // 4. Batch mutation (100 contacts)
        const t0batch = performance.now()
        ydoc.transact(() => {
          for (let i = 0; i < 100; i++) {
            const cm = new Y.Map()
            const c = generateContact(10000 + i)
            for (const [k, v] of Object.entries(c)) cm.set(k, v)
            contactsMap.set(`did:key:z6Mkbatch${i}`, cm)
          }
        })
        const batchMs = Math.round(performance.now() - t0batch)

        // 5. Serialize
        const t0ser = performance.now()
        const saved = Y.encodeStateAsUpdate(ydoc)
        const serMs = Math.round(performance.now() - t0ser)

        ydoc.destroy()

        logResult({
          scenario: scenario.name,
          crdt: 'yjs',
          snapshotSize: saved.length,
          initTimeMs: initMs,
          singleMutationMs: singleMs,
          batchMutationMs: batchMs,
          serializeMs: serMs,
        })
      })
    })
  }

  it('Summary', () => {
    console.log('\n=== CRDT Benchmark Summary ===\n')
    console.log('Scenario             | CRDT      | Init    | Mutate1 | Mutate100 | Serialize | Size')
    console.log('---------------------|-----------|---------|---------|-----------|-----------|--------')
    for (const r of results) {
      console.log(
        `${r.scenario.padEnd(20)} | ${r.crdt.padEnd(9)} | ${String(r.initTimeMs).padStart(5)}ms | ${String(r.singleMutationMs).padStart(5)}ms | ${String(r.batchMutationMs).padStart(7)}ms | ${String(r.serializeMs).padStart(7)}ms | ${String(r.snapshotSize).padStart(7)}B`
      )
    }
    console.log('')

    // Verify all results were collected
    expect(results).toHaveLength(SCENARIOS.length * 2)
  })
})
