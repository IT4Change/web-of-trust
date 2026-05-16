import {
  IndexedDbIdentitySeedVault,
  type IndexedDbIdentitySeedVaultOptions,
} from './IndexedDbIdentitySeedVault'
import type { SeedStorageAdapter } from '../../ports/SeedStorageAdapter'

export type SeedStorageIdentityVaultOptions = IndexedDbIdentitySeedVaultOptions

/**
 * @deprecated Use IndexedDbIdentitySeedVault for the browser reference identity
 * seed vault. This compatibility wrapper remains only for older imports.
 */
export class SeedStorageIdentityVault extends IndexedDbIdentitySeedVault {
  constructor(storageOrOptions: SeedStorageAdapter | SeedStorageIdentityVaultOptions = {}) {
    super(storageOrOptions)
  }
}
