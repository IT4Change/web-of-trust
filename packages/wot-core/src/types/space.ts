export type ReplicationState = 'idle' | 'syncing' | 'error'

/**
 * Kennung der Aufnahme in einen Space: die Generation des Space-Schluessels,
 * mit der die aktuelle Mitgliedschaft aufgenommen wurde (RLS-Spec 12 Regel 4).
 *
 * Die Generation traegt die Aussage allein: eine Entfernung rotiert den
 * Space-Schluessel (Sync 005), eine Wiederaufnahme laeuft also zwingend ueber
 * eine hoehere Generation als die vorherige Aufnahme. Eine Doppel-Einladung an
 * ein bestehendes Mitglied traegt dagegen dieselbe Generation und ist damit
 * korrekt KEINE Wiederaufnahme. Eine blosse Rotation (ein Dritter wird
 * entfernt) aendert die Kennung nicht — sie wird nur beim Erstellen und beim
 * Anwenden einer Einladung gesetzt.
 *
 * Bewusst geraeteunabhaengig: der Wert ist auf allen Geraeten derselben
 * Identitaet identisch und wandert ueber den Metadata-Sync — kein lokaler
 * Schluesselzustand, kein Hash ueber zeitabhaengige Capability-Felder.
 */
export interface SpaceAdmission {
  /** currentKeyGeneration der Einladung; beim Erstellen 0 */
  keyGeneration: number
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
   * Bestands-Spaces, die vor ihrer Einfuehrung angelegt wurden, tragen keine —
   * sie gelten als freigegeben und bekommen erst durch eine neu angewandte
   * Einladung (Wiederaufnahme) eine Kennung. Nichts leitet sie nachtraeglich
   * aus lokalem Schluesselzustand ab.
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
