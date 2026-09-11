export type ReplicationState = 'idle' | 'syncing' | 'error'

/**
 * Kennung der Aufnahme in einen Space: die Einladung (bzw. das Erstellen), auf
 * die die aktuelle Mitgliedschaft zurueckgeht (RLS-Spec 12 Regel 4). Aendert
 * sich NICHT bei Schluesselrotation, sondern nur durch eine neu angewandte
 * Einladung (Wiederaufnahme) — so erkennt ein Geraet, das Entfernung und
 * Wiederaufnahme offline verpasst hat, die neue Aufnahme trotzdem.
 */
export interface SpaceAdmission {
  /** currentKeyGeneration der Einladung; beim Erstellen 0 */
  keyGeneration: number
  /** sha256 (lowercase hex) ueber die eigene Capability-JWS (UTF-8) dieser Generation; null, wenn keine eigene Capability vorliegt (Alt-Space) */
  capabilityId: string | null
}

export interface SpaceInfo {
  id: string
  type: 'personal' | 'shared'
  name?: string
  description?: string
  image?: string
  modules?: string[]
  /** App identifier for cross-app space isolation (e.g. 'rls', 'wot-demo') */
  appTag?: string
  members: string[] // DIDs
  /**
   * Creator-DID — read-only Projektion aus dem Space-Doc (`_meta.createdBy`,
   * VE-2). SPEC-APPROX: dient als Admin-Approximation (`knownAdminDids =
   * [createdBy]`), bis der admin-management-Slice die volle Admin-Liste bringt.
   * Optional: Alt-Spaces ohne `createdBy` fallen auf `members[0]` zurück.
   */
  createdBy?: string
  /**
   * Admin-DIDs — read-only Projektion der AKTIVEN Admins aus dem Space-Doc
   * (`_admins` ∩ aktive `_members`, Sync 005 Z.111-130, VE-1/VE-6). Additiv zum
   * Typ wie `members`/`createdBy`. Schreiber sind ausschliesslich `createSpace`
   * (Creator als erster Admin) + `promoteToAdmin`; ein als Member entfernter
   * Admin faellt automatisch aus dieser Liste (`resolveActiveAdmins`).
   * Optional: Alt-Spaces vor diesem Slice haben leeres `_admins` und fallen in
   * `spaceAdminDids` auf `[createdBy ?? members[0]]` zurueck.
   */
  admins?: string[]
  createdAt: string
  /**
   * App-defined metadata (read-only projection of `_meta.appData`). The fixed
   * catalog above (name/image/modules) covers framework fields; apps extend
   * spaces with their own JSON fields here (e.g. RLS accent color) WITHOUT a
   * schema change per field — the closed catalog was exactly how app fields
   * ended up cache-only and vanished on reload (rls#234).
   */
  appData?: Record<string, unknown>
  /**
   * Aufnahme-Kennung dieser Mitgliedschaft (RLS-Spec 12 Regel 4). Optional:
   * Alt-Spaces ohne persistierte Kennung leiten sie beim Restore lazy aus der
   * eigenen Capability der aktuellen Generation ab.
   */
  admission?: SpaceAdmission
}

export interface SpaceDocMeta {
  name?: string
  description?: string
  image?: string
  modules?: string[]
  /**
   * Shallow PATCH of the app-defined metadata: listed keys are merged over
   * the stored ones, `null` removes a key (JSON Merge Patch, RFC 7386, at
   * depth 1). Values must be JSON-serializable. Adapters MUST store the
   * fields with per-key CRDT granularity (adapter-yjs: flat prefixed keys in
   * `_meta`) so concurrent patches of different keys from two devices merge
   * per key instead of last-writer-wins on a whole container.
   */
  appData?: Record<string, unknown>
}

export interface SpaceMemberChange {
  spaceId: string
  did: string
  action: 'added' | 'removed'
}

/**
 * Decoded incoming space-invite event. The wire payload is an ECIES container
 * (1.B.3-key-rotation), so consumers (e.g. invite dialogs) must not parse
 * MessageEnvelope.payload — adapters emit this event after a verified apply.
 */
export interface IncomingSpaceInvite {
  spaceId: string
  spaceName?: string
  fromDid: string
  /**
   * Per-event unique id of the invite delivery (the verified inbox envelope's
   * outerId). Consumers use it as the stable notification identity — a
   * per-space key would permanently block re-invites of the same space once
   * one invite was resolved. Required so tsc forces every emit site to pass it.
   */
  inviteMessageId: string
  /**
   * Aufnahme-Kennung dieser Einladung (RLS-Spec 12 Regel 4) — identisch zu
   * `SpaceInfo.admission` nach dem Apply. Pflicht, damit tsc jede Emit-Stelle
   * zwingt, sie mitzugeben.
   */
  admission: SpaceAdmission
}
