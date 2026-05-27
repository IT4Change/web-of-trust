import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Trust 002 verification storage port source guard', () => {
  const read = (file: string): string => {
    const candidates = [file, path.join('..', '..', file), path.join('..', file)]
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8')
    }
    throw new Error(`source guard cannot locate ${file}`)
  }

  it('removes legacy Trust-001 verification storage APIs from core ports and LocalStorageAdapter', () => {
    const files = [
      'packages/wot-core/src/ports/StorageAdapter.ts',
      'packages/wot-core/src/ports/ReactiveStorageAdapter.ts',
      'packages/wot-core/src/adapters/storage/LocalStorageAdapter.ts',
      'packages/wot-core/README.md',
    ] as const

    const legacyNeedles = [
      'saveVerification',
      'getReceivedVerifications',
      'getAllVerifications',
      'getVerification(',
      'watchReceivedVerifications',
      'watchAllVerifications',
      'verifications:',
      "createObjectStore('verifications')",
      "db.clear('verifications')",
    ] as const

    const hits: string[] = []

    for (const file of files) {
      const text = read(file)
      for (const needle of legacyNeedles) {
        if (text.includes(needle)) {
          hits.push(`${file}: still contains ${needle}`)
        }
      }
    }

    expect(hits).toEqual([])
  })
})
