import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('legacy identity implementation removal', () => {
  it('does not keep the deprecated internal identity implementation', () => {
    const legacyFileName = `${'Wot'}${'Identity'}.ts`
    const legacyPath = resolve(process.cwd(), 'packages/wot-core/src/identity', legacyFileName)

    expect(existsSync(legacyPath)).toBe(false)
  })
})
