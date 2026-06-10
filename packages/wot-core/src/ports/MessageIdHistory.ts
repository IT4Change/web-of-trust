/**
 * Replay-Schutz über bereits verarbeitete Inbox-Message-IDs (Sync 003 Z.466 MUSS):
 * `id` DARF nicht bereits verarbeitet worden sein (Message-ID-History) — die zweite
 * Replay-Verteidigung neben dem `created_time`-Fenster des Inner-JWS (Z.465).
 *
 * Der Inner-JWS-Verifier ist pure (Prüfungen 1-4); Prüfung 5 macht der
 * Reception-Workflow über diesen Port. Die Referenzimplementierung liefert einen
 * In-Memory-Default (adapters/message-id-history); eine Produktions-App verdrahtet
 * einen durablen Store (1.D Demo-Hooks).
 */
export interface MessageIdHistoryPort {
  /**
   * Prüft, ob `id` bereits verarbeitet wurde (Replay), und markiert sie atomar
   * im selben Aufruf als gesehen.
   *
   * @returns `true` wenn die id schon bekannt war (Replay → Nachricht verwerfen),
   *          `false` wenn sie neu ist und jetzt als gesehen gilt.
   */
  checkAndRecord(id: string, nowIso: string): Promise<boolean>

  /**
   * Entfernt Einträge, die älter als `cutoffIso` sind (24h-Retention, Sync 003
   * Z.465 analog Nonce-History): Nachrichten jenseits des `created_time`-Fensters
   * werden ohnehin von Pflichtprüfung 4 abgewiesen, ihre IDs müssen nicht
   * unbegrenzt vorgehalten werden.
   */
  prune(cutoffIso: string): Promise<void>
}
