export {
  initYjsPersonalDoc,
  getYjsPersonalDoc,
  changeYjsPersonalDoc,
  onYjsPersonalDocChange,
  flushYjsPersonalDoc,
  refreshYjsPersonalDocFromVault,
  resetYjsPersonalDoc,
  deleteYjsPersonalDocDB,
} from './YjsPersonalDocManager'
export type { YjsPersonalDoc } from './YjsPersonalDocManager'

export { YjsPersonalSyncAdapter } from './YjsPersonalSyncAdapter'

// Slice A VE-6: Personal-Doc multi-device sync on the Sync 002/003 log path.
export { YjsPersonalLogSyncAdapter } from './YjsPersonalLogSyncAdapter'
export type { YjsPersonalLogSyncConfig } from './YjsPersonalLogSyncAdapter'
// Slice A P2-NIT-1: restore-clone mechanism (shared by Space + Personal-Doc paths).
export { createRestoreCloneHandler } from './logRestoreClone'
export type { RestoreCloneControllerConfig } from './logRestoreClone'

export { YjsReplicationAdapter } from './YjsReplicationAdapter'
export type { YjsCompactStore } from './YjsReplicationAdapter'

export { YjsStorageAdapter } from './YjsStorageAdapter'

// Re-export document types for consumers
export type {
  PersonalDoc,
  ProfileDoc,
  ContactDoc,
  AttestationDoc,
  AttestationMetadataDoc,
  OutboxEntryDoc,
  SpaceMetadataDoc,
  GroupKeyDoc,
} from './types'
