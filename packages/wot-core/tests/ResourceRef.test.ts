import { describe, it, expect } from 'vitest'
import {
  createResourceRef,
  parseResourceRef,
  type ResourceRef,
} from '../src/types/resource-ref'

describe('ResourceRef', () => {
  describe('createResourceRef', () => {
    it('should create a simple attestation ref', () => {
      const ref = createResourceRef('attestation', 'abc-123')
      expect(ref).toBe('wot:attestation:abc-123')
    })

    it('should create a verification ref', () => {
      const ref = createResourceRef('verification', 'def-456')
      expect(ref).toBe('wot:verification:def-456')
    })

    it('should create a contact ref with did:key', () => {
      const ref = createResourceRef('contact', 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')
      expect(ref).toBe('wot:contact:did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')
    })

    it('should create a space ref with subPath', () => {
      const ref = createResourceRef('space', 'wg-kalender', 'item/event-789')
      expect(ref).toBe('wot:space:wg-kalender/item/event-789')
    })

    it('should create a space ref with module subPath', () => {
      const ref = createResourceRef('space', 'wg-kalender', 'module/kanban')
      expect(ref).toBe('wot:space:wg-kalender/module/kanban')
    })

    it('should create an item ref', () => {
      const ref = createResourceRef('item', 'item-42')
      expect(ref).toBe('wot:item:item-42')
    })
  })

  describe('parseResourceRef', () => {
    it('should parse a simple attestation ref', () => {
      const ref = createResourceRef('attestation', 'abc-123')
      const parsed = parseResourceRef(ref)
      expect(parsed).toEqual({ type: 'attestation', id: 'abc-123' })
    })

    it('should parse a space ref with subPath', () => {
      const ref = createResourceRef('space', 'wg-kalender', 'item/event-789')
      const parsed = parseResourceRef(ref)
      expect(parsed).toEqual({
        type: 'space',
        id: 'wg-kalender',
        subPath: 'item/event-789',
      })
    })

    it('should parse a contact ref with did:key (colons in id)', () => {
      const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'
      const ref = createResourceRef('contact', did)
      const parsed = parseResourceRef(ref)
      expect(parsed).toEqual({ type: 'contact', id: did })
    })

    it('should roundtrip all resource types', () => {
      const types = ['attestation', 'verification', 'contact', 'space', 'item'] as const
      for (const type of types) {
        const ref = createResourceRef(type, `test-${type}`)
        const parsed = parseResourceRef(ref)
        expect(parsed.type).toBe(type)
        expect(parsed.id).toBe(`test-${type}`)
      }
    })
  })

  describe('error cases', () => {
    it('should throw on missing wot: prefix', () => {
      expect(() => parseResourceRef('invalid:ref' as ResourceRef)).toThrow('must start with "wot:"')
    })

    it('should throw on unknown type', () => {
      expect(() => parseResourceRef('wot:unknown:id' as ResourceRef)).toThrow('unknown type')
    })

    it('should throw on missing id', () => {
      expect(() => parseResourceRef('wot:attestation:' as ResourceRef)).toThrow('missing id')
    })

    it('should throw on missing type', () => {
      expect(() => parseResourceRef('wot:' as ResourceRef)).toThrow('missing type')
    })
  })
})
