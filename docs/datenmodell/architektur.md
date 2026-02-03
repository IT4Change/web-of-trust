# Architektur

> Framework-agnostische Architektur des Web of Trust

## Überblick

Das Web of Trust ist **framework-agnostisch** aufgebaut. Die Kernlogik ist unabhängig von der konkreten Implementierung der Datenhaltung, Kryptografie und Synchronisation.

```
┌─────────────────────────────────────────────────────────────┐
│                     WoT Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              WoT Domain Layer                        │   │
│  │  • Identity, Contact, Verification, Attestation     │   │
│  │  • Business Logic (Empfänger-Prinzip)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Adapter Interfaces                      │   │
│  │  • StorageAdapter                                    │   │
│  │  • CryptoAdapter                                     │   │
│  │  • SyncAdapter                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           ▼               ▼               ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │IndexedDB    │  │   Evolu     │  │    Jazz     │        │
│  │Adapter      │  │  Adapter    │  │   Adapter   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Adapter-Pattern

Die Adapter-Interfaces ermöglichen es, verschiedene Frameworks auszuprobieren, ohne die Kernlogik zu ändern.

### Warum Framework-agnostisch?

1. **Flexibilität**: Verschiedene Backends können getestet werden
2. **Zukunftssicherheit**: Neue Frameworks können integriert werden
3. **Community**: Unterschiedliche Teams können verschiedene Implementierungen beitragen
4. **Testing**: Einfaches Mocking für Unit-Tests

## Kernkonzepte

### Empfänger-Prinzip

Das zentrale Designprinzip: **Daten werden beim Empfänger gespeichert.**

```
Anna → Verification → Ben
       └─────────────────┘
       Gespeichert bei Ben

Anna → Attestation → Ben
       └────────────────┘
       Gespeichert bei Ben
```

**Warum?**
- Jeder kontrolliert seine eigenen Daten
- Keine Konflikte beim Schreiben (jeder schreibt nur in seinen eigenen Speicher)
- Einfachere CRDT-Konfliktauflösung
- Privacy: Ich entscheide, was über mich sichtbar ist

### Verification = Gegenseitige Bestätigung

Eine Verification ist eine signierte Aussage: "Ich habe diese Person verifiziert."

```
Anna verifiziert Ben:
┌────────────────────────────────────┐
│ Verification                       │
│ from: did:key:anna                 │
│ to: did:key:ben    ← Speicherort   │
│ proof: anna_signature              │
└────────────────────────────────────┘
→ Gespeichert bei Ben

Ben verifiziert Anna:
┌────────────────────────────────────┐
│ Verification                       │
│ from: did:key:ben                  │
│ to: did:key:anna   ← Speicherort   │
│ proof: ben_signature               │
└────────────────────────────────────┘
→ Gespeichert bei Anna
```

Jede Richtung ist ein **separates Dokument** mit **einer Signatur**.

### Attestation = Geschenk

Eine Attestation ist eine signierte Aussage über jemanden - wie ein Geschenk.

```
┌────────────────────────────────────┐
│ Attestation (signiert von Anna)    │
│ from: did:key:anna                 │
│ to: did:key:ben    ← Speicherort   │
│ claim: "Kann gut kochen"           │
│ proof: anna_signature              │
└────────────────────────────────────┘
→ Gespeichert bei Ben
→ Ben entscheidet: accepted = true/false
```

**Wichtig:** Das `accepted`-Flag ist **nicht** Teil des signierten Dokuments. Es ist lokale Metadaten, die nur der Empfänger kontrolliert.

### Contact = Lokaler Cache

Ein Contact speichert den Public Key einer verifizierten Person für E2E-Verschlüsselung.

```
Contact {
  did: "did:key:ben"
  publicKey: "..."        // Für Verschlüsselung
  status: "active"        // pending | active
}
```

## Adapter Interfaces

Die konkreten Interface-Definitionen befinden sich in `packages/wot-core/src/adapters/interfaces/`.

### StorageAdapter

Verantwortlich für:
- Persistierung aller Daten (Identity, Contacts, Verifications, Attestations)
- Lokale Metadaten (AttestationMetadata mit `accepted`)

**Implementierungen:**
- `LocalStorageAdapter` (IndexedDB) - enthalten in wot-core
- `EvolAdapter` - geplant
- `JazzAdapter` - geplant

### CryptoAdapter

Verantwortlich für:
- Key-Generierung (Ed25519)
- Mnemonic / Recovery Phrase (BIP39)
- Signieren und Verifizieren
- Verschlüsselung (X25519 + AES-GCM)
- DID-Konvertierung (did:key)

**Implementierungen:**
- `WebCryptoAdapter` - enthalten in wot-core (teilweise)

### SyncAdapter

Verantwortlich für:
- Verbindung zu Peers / Server
- Push und Pull von Änderungen
- Konfliktauflösung (CRDT)

**Implementierungen:**
- `NoOpSyncAdapter` - Placeholder
- CRDT-basierte Implementierung - geplant

## Referenz: wot-core

Die TypeScript-Definitionen aller Typen und Interfaces befinden sich im `packages/wot-core` Package:

```
packages/wot-core/src/
├── types/
│   ├── identity.ts      # Identity, Profile, KeyPair
│   ├── contact.ts       # Contact, ContactStatus
│   ├── verification.ts  # Verification, GeoLocation
│   ├── attestation.ts   # Attestation, AttestationMetadata
│   └── proof.ts         # Proof (W3C Data Integrity)
├── adapters/
│   └── interfaces/
│       ├── StorageAdapter.ts
│       ├── CryptoAdapter.ts
│       └── SyncAdapter.ts
└── crypto/
    ├── did.ts           # did:key Implementierung
    ├── jws.ts           # JSON Web Signature
    └── encoding.ts      # Base58, Base64Url
```

## Framework-Evaluation

Für eine detaillierte Analyse möglicher CRDT/E2EE Frameworks siehe:
→ [Framework-Evaluation](../protokolle/framework-evaluation.md)

## Weiterführend

- [Entitäten](entitaeten.md) - Datenmodell im Detail
- [Sync-Protokoll](../protokolle/sync-protokoll.md) - Wie Daten synchronisiert werden
- [Verschlüsselung](../protokolle/verschluesselung.md) - E2E-Verschlüsselung
