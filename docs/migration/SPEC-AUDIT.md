# Spec-Conformance-Audit (Phase 1.F)

**Erstausgabe**: 2026-06-08
**Audit-Subjekt**: `web-of-trust` `spec-vnext`
**Methodik**: § 1.F im Master-Plan + § Methode für Workflow-/Service-Migration (Variante B)
**Auditor**: in dieser Claude-Session, gegen `wot-spec/` Stand 2026-06-08

> **Variante-B-Prinzip**: Drift-tragender Code wird **ersatzlos gelöscht und neu aus Spec geschrieben**, nicht "refaktoriert". Audit klassifiziert nur — Behebung passiert in 1.B.3-Sub-Slices oder eigenen 1.F.N-Slices.

---

## 1.F.0 — Retroaktiver Spot-Check der gemergten Slices

### 1.A.2 — capabilities + AuthorizationAdapter (PR #163)

**Audit-Frage**: Ist die Verwendung von `capabilities` und `AuthorizationAdapter` nach dem Move spec-konform, oder Legacy-Übernahme?

**Spec-Anker**: wot-spec#95 (Anton's Resolution) — `capabilities` ist nicht-normativ (UCAN-style App-Level), korrekt in `application/authorization/`.

**Befunde:**

| Stelle | Klassifikation | Begründung |
|---|---|---|
| `application/authorization/capabilities.ts` Move nach `application/` | ✅ **konform** | Entspricht Anton's #95-Entscheidung. UCAN-style ist nicht normativ; korrekt von `protocol/sync/space-capability.ts` (normativ) abgegrenzt. |
| `adapters/vault/VaultClient.ts:9` — produktiver Konsument von `createCapability` | ✅ **konform** | Vault-HTTP-Auth (Bearer Token + signed Capability per Request). Legitimer App-Layer-Use-Case. |
| `application/authorization/AuthorizationAdapter.ts` + `adapters/authorization/InMemoryAuthorizationAdapter.ts` | ⚠️ **drift:minor (toter Code)** | **0 produktive Konsumenten**. Nur Tests + Re-Exports im Root-Index. Datei-eigener Kommentar sagt "InMemoryAuthorizationAdapter (tests)". |

**Drift-Befund A2-1**: `AuthorizationAdapter`-Port + `InMemoryAuthorizationAdapter` haben null produktive Konsumenten. **Klassifikation: drift:minor (tote Architektur)**.

**Verortung**: 1.F.N-Mini-Slice oder direkt in 1.B.3-encrypted-sync-Aufräum-Commit. Entscheidung:

- **Option a)** Ersatzlos löschen — `ports/AuthorizationAdapter`-Export entfernen, `adapters/authorization/` löschen, Root-Index Re-Export entfernen. Tests gehen mit weg.
- **Option b)** Klar als "geplant für Phase 2, kein Produktiv-Code" markieren — Datei-Kopf-Kommentar mit Verweis.

Empfehlung: a) Löschen. Wenn Phase 2 einen Authorization-Port braucht, schreiben wir ihn dann spec-zuerst — nicht jetzt einen ungenutzten Skelett-Port konservieren.

---

### 1.B.2-ack — `accepted`-Flag-Implementation (PR #166)

**Audit-Frage**: Ist die `accepted`-Flag-Implementation in Demo wirklich spec-konformes Publish-Consent, oder schmuggelt sie an irgendeiner Stelle Trust-Akzeptanz-Semantik mit?

**Spec-Anker**: Trust 001 Z.147/Z.149 — kein `attestation-ack`, keine semantische Annahmebestätigung wird ZURÜCKGESENDET. Plus Sync 004 — `/p/{did}/a` Profile-Service Attestation-List ist die normative Profil-Veröffentlichung.

**Befunde:**

| Stelle | Klassifikation | Begründung |
|---|---|---|
| `apps/demo/src/services/AttestationService.ts:243` — `setAttestationAccepted(id, accepted)` API | ✅ **konform** | Holder-Workflow für Publish-Consent. Lokale Storage-Mutation, keine Wire-Nachricht zurück an den Issuer. |
| `apps/demo/src/hooks/useProfileSync.ts:88-94` — filtert `meta?.accepted` und veröffentlicht via Discovery | ✅ **konform** | Genau das, was Sync 004 vorsieht: Holder publiziert seine Attestation-Liste. `accepted`-Flag gatet Sichtbarkeit. |
| `apps/demo/src/adapters/AutomergeStorageAdapter.ts:237` — Storage-Persistenz | ✅ **konform** | Pures Storage, kein Wire-Verhalten. |
| `apps/demo/src/services/AttestationService.ts:162,210` — `receipt.status === 'accepted'` | ✅ **konform** (Naming-Confusion) | Hier ist `'accepted'` ein Sync 003 ack/1.0 Wire-Wert vom Relay, NICHT das Demo-`accepted`-Flag. Semantisch korrekt, nur verwirrend gleich benannt. |

**`accepted`-Flag-Implementation an sich ist spec-konform.**

**Aber:** im selben File (`AttestationService.ts`) fand sich ein anderer Drift, der nicht zur `accepted`-Audit-Frage gehört, aber kritisch ist:

**Drift-Befund B2ack-1**: `AttestationService.ts:193-204` baut `MessageEnvelope` mit:
- `v: 1`, `fromDid`, `toDid`, `createdAt`, `encoding`, `payload`, `signature`, `ref` (Legacy-Form, nicht Sync 003)
- `ref: createResourceRef('attestation', attestation.id)` — gleiche Spec-Drift wie PR #173 (siehe wot-spec#175)

**Klassifikation: drift:blocker**.

**Verortung**: gehört in einen dedizierten 1.F.N-Slice oder in 1.B.3-Adapter-Audit. Wird nach 1.B.2-verification-v2 mitbetroffen sein — wenn dort der spec-konforme DIDComm-Plaintext-Envelope-Bau für Attestation-Delivery entsteht, kann `AttestationService.ts` ihn nutzen.

---

## 1.F-Quervergleich: Adapter-Layer-Drift (CRDT-Stack)

**Konsumenten-Inventur Legacy-MessageEnvelope-Format:**

```
adapter-automerge/AutomergeReplicationAdapter.ts — 5+ MessageEnvelope-Bauer
adapter-yjs/YjsReplicationAdapter.ts — 5+ MessageEnvelope-Bauer
apps/demo/src/services/AttestationService.ts — 1
```

**Spec-Anker**: Sync 003 Z.343-392 (Felder-Tabelle) — normative DIDComm-Plaintext-Envelope-Form mit `id`, `typ`, `type`, `from`, `to`, `created_time`, `thid`, `pthid`, `body`. Legacy-MessageEnvelope-Format ist Phase-2-Sterbe-Material (siehe DoD #17 + wot-spec#96-Resolution).

**Klassifikation**: **drift:blocker für Phase 2**, **drift:minor für Phase 1** — innerhalb Phase 1 ist der Automerge-Stack bewusst Legacy (siehe `crypto/envelope-auth.ts` Legacy-Marker, dies #17). Phase-1-Refactor des Adapter-Stacks ist nicht im Scope.

**Konsequenz für Phase 1 1.B.3**: Neue Workflows (`application/sync/encrypted-change-workflow.ts` etc.) dürfen **nicht** Legacy-MessageEnvelope-Form produzieren oder davon abhängen. Sie liefern spec-konforme DIDComm-Plaintext-Envelope-Form (oder rohes Crypto-Material, das der Adapter dann legacy-wrappt — letzteres ist bewusst dokumentierte Phase-1-Übergangs-Grenze).

---

## 1.B.3-encrypted-sync — Vor-Audit (vor Umsetzung)

**Konsumenten-Inventur `EncryptedSyncService.encryptChange` / `decryptChange`**:

```
adapter-automerge/PersonalDocManager.ts:355,446
adapter-automerge/EncryptedMessagingNetworkAdapter.ts:111,166
adapter-automerge/AutomergeReplicationAdapter.ts:334,351,379,396,484,731,1016
adapter-automerge/PersonalNetworkAdapter.ts:101,215
```

~14 produktive Call-Sites, alle im Automerge-Adapter-Stack. Yjs-Stack nutzt `EncryptedSyncService` nicht direkt (über andere Pfade).

**Spec-Anker für 1.B.3-encrypted-sync**:

- Sync 001 Z.87 — deterministische Nonce `SHA-256(deviceId || "|" || seq)[0:12]` für Log-Payloads (MUSS).
- Sync 001 Z.103-105 — random Nonce für Snapshots, Messaging-Payloads, Personal-OneShots (MUSS), DARF NICHT deterministisch sein.
- Sync 001 Z.75 — Log-Payloads und ECIES MÜSSEN nicht-leere Klartexte verwenden.
- Sync 001 §`Encrypted Sync Frame` — Wire-Format ist `nonce ‖ ciphertext+tag` Blob.

**Bereits spec-konform vorhanden** in `protocol/sync/encryption.ts`:

- `encryptLogPayload({crypto, spaceContentKey, deviceId, seq, plaintext})` → liefert `{nonce, ciphertextTag, blob, blobBase64Url}`. Gegen `log_payload_encryption`-Vektor validiert.
- `encryptEcies({crypto, ephemeralPrivateSeed, recipientPublicKey, nonce, plaintext})` → ECIES für Peer-to-Peer. Gegen `ecies`-Vektor validiert.

**Methode für 1.B.3-encrypted-sync**:

1. Pro Call-Site klassifizieren: **Log-Payload** (Sync-002-Log-Schreibpfad mit eindeutigem `(deviceId, seq)`) oder **OneShot** (Snapshot/Messaging/Personal/Out-of-Band).
2. Log-Payload-Call-Sites → `protocol/sync/encryption.ts:encryptLogPayload` direkt aufrufen oder über schlanken Application-Layer.
3. OneShot-Call-Sites → neuer Helper `encryptOneShot(opts)` in `application/sync/` der intern AES-GCM mit Random Nonce baut, im selben Blob-Format wie Log-Payload (kompatibler Decrypt-Pfad).
4. **`services/EncryptedSyncService.ts` ersatzlos löschen**, Root-Index-Export entfernen, Konsumenten umhängen.
5. PR-Body: Spec-Zitat-Block + Call-Site-Klassifikations-Liste + Konsumenten-Migration-Trace.

**Klassifikation der 14+ Call-Sites pro Adapter — vor PR-Open**: ich erstelle die Klassifikations-Tabelle als Teil der 1.B.3-encrypted-sync-Vorbereitung (separate Inventur-Sektion in diesem SPEC-AUDIT.md, sobald die Call-Sites einzeln gelesen sind).

---

## Status & Nächste Schritte

| Befund | Klassifikation | Slice |
|---|---|---|
| **A2-1**: `AuthorizationAdapter` + `InMemoryAuthorizationAdapter` ungenutzt | drift:minor (tote Architektur) | 1.F.N-Mini oder im Aufräum-Commit von 1.B.3-encrypted-sync |
| **B2ack-1**: `AttestationService.ts:193-204` Envelope mit `ref` + Legacy-Form | drift:blocker | 1.B.2-verification-v2 (parallel) oder eigener 1.F.N-Slice |
| **CRDT-Adapter Legacy-MessageEnvelope** | drift:blocker für Phase 2 | Phase 2+ (außerhalb Phase 1-Scope) |
| **`services/EncryptedSyncService.ts`** Spec-Drift (random Nonce, getrennte Felder) | drift:blocker | 1.B.3-encrypted-sync |
| **`services/GroupKeyService.ts`** noch nicht detailliert auditiert | (offen) | 1.B.3-group-key |
| **`services/ProfileService.ts`** noch nicht detailliert auditiert | (offen) | 1.B.3-profile-service |

**Aktion direkt jetzt**: 1.B.3-encrypted-sync starten — wir wissen alles was wir wissen müssen.
