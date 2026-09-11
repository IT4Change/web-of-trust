import { describe, it, expect } from 'vitest'
import { isSameAdmission, compareAdmission } from '../src/application/spaces/admission'
import { PersonalDocSpaceMetadataStorage } from '../src/adapters/storage/AutomergeSpaceMetadataStorage'
import type { SpaceInfo } from '../src/types/space'

describe('SpaceAdmission (RLS-Spec 12 Regel 4: Aufnahme-Kennung je Space)', () => {
  it('isSameAdmission vergleicht die Generation und toleriert undefined', () => {
    expect(isSameAdmission({ keyGeneration: 1 }, { keyGeneration: 1 })).toBe(true)
    expect(isSameAdmission({ keyGeneration: 1 }, { keyGeneration: 2 })).toBe(false)
    expect(isSameAdmission(undefined, undefined)).toBe(true)
    expect(isSameAdmission(undefined, { keyGeneration: 0 })).toBe(false)
    expect(isSameAdmission({ keyGeneration: 0 }, null)).toBe(false)
  })

  it('compareAdmission ordnet aufsteigend nach Generation', () => {
    expect(compareAdmission({ keyGeneration: 1 }, { keyGeneration: 0 })).toBeGreaterThan(0)
    expect(compareAdmission({ keyGeneration: 0 }, { keyGeneration: 1 })).toBeLessThan(0)
    expect(compareAdmission({ keyGeneration: 2 }, { keyGeneration: 2 })).toBe(0)
    // Monotonie-Kriterium des Metadata-Sync: eine noch fehlende Kennung ist
    // kleiner als jede vorhandene.
    expect(compareAdmission({ keyGeneration: 0 }, { keyGeneration: -1 })).toBeGreaterThan(0)
  })
})

describe('PersonalDocSpaceMetadataStorage — Roundtrip der Aufnahme-Kennung', () => {
  /**
   * PersonalDoc-Backing wie im Adapter-Betrieb: Lesen liefert eine KOPIE des
   * Dokumentstands (JSON-Roundtrip, wie ihn Y.Doc/Automerge erzeugen), Schreiben
   * ersetzt ihn. Damit laeuft der echte Serializer, nicht eine Referenz.
   */
  function storageOverDoc(): PersonalDocSpaceMetadataStorage {
    let doc: Record<string, Record<string, unknown>> = { spaces: {}, groupKeys: {}, capabilitySigningSeeds: {} }
    const read = () => JSON.parse(JSON.stringify(doc)) as Record<string, Record<string, unknown>>
    return new PersonalDocSpaceMetadataStorage({
      getPersonalDoc: read,
      changePersonalDoc: (change) => { const s = read(); change(s); doc = JSON.parse(JSON.stringify(s)) },
    })
  }

  const baseInfo: SpaceInfo = {
    id: 'space-1',
    type: 'shared',
    members: ['did:key:zAlice'],
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  it('speichert und liest die Kennung durch den echten Serializer', async () => {
    const storage = storageOverDoc()
    await storage.saveSpaceMetadata({
      info: { ...baseInfo, admission: { keyGeneration: 3 } },
      documentId: 'space-1',
      documentUrl: 'yjs:space-1',
      memberEncryptionKeys: {},
    })
    const loaded = await storage.loadSpaceMetadata('space-1')
    expect(loaded!.info.admission).toEqual({ keyGeneration: 3 })
    // Der Serializer liefert eine KOPIE — ein Aufrufer kann den gespeicherten
    // Stand nicht per Referenz mitmutieren (das ist die Grundlage der
    // Monotonie-Pruefung im Metadata-Sync).
    loaded!.info.admission!.keyGeneration = 99
    expect((await storage.loadSpaceMetadata('space-1'))!.info.admission).toEqual({ keyGeneration: 3 })
  })

  it('Bestand ohne Kennung bleibt ohne Kennung (kein Default, kein Fehler)', async () => {
    const storage = storageOverDoc()
    await storage.saveSpaceMetadata({
      info: { ...baseInfo },
      documentId: 'space-1',
      documentUrl: 'yjs:space-1',
      memberEncryptionKeys: {},
    })
    const loaded = await storage.loadSpaceMetadata('space-1')
    expect(loaded!.info.admission).toBeUndefined()
  })
})
