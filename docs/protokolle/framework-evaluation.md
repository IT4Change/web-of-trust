# Framework-Evaluation

> Analyse von Local-First, CRDT und E2EE Frameworks für das Web of Trust

## Motivation

Das Web of Trust benötigt:
- **Offline-First**: Alle Operationen funktionieren ohne Verbindung
- **E2E-Verschlüsselung**: Server sieht nur verschlüsselte Daten
- **CRDTs**: Automatische, deterministische Konfliktauflösung
- **DID-Kompatibilität**: Interoperabilität mit W3C Standards
- **React Native**: Mobile-First Entwicklung

Diese Evaluation untersucht existierende Frameworks und definiert eine framework-agnostische Architektur.

---

## Evaluierte Frameworks

### Übersicht

| Framework | E2EE | DID | CRDT | React Native | Reife |
|-----------|------|-----|------|--------------|-------|
| [NextGraph](#nextgraph) | ✅ Native | ✅ Ja | Yjs + Automerge | ⚠️ Unklar | Alpha |
| [Evolu](#evolu) | ✅ Native | ❌ | SQLite + CRDT | ✅ Voll | Produktiv |
| [Jazz](#jazz) | ✅ Native | ❌ | CoJSON | ✅ Dokumentiert | Beta |
| [Secsync](#secsync) | ✅ Native | ❌ | Agnostisch | ⚠️ Unklar | Beta |
| [p2panda](#p2panda) | ✅ Double Ratchet | ❌ | Beliebig | ✅ FFI | Aktiv |
| [DXOS](#dxos) | ✅ Native | ❌ | Automerge | ❌ Web only | Produktiv |
| [Keyhive](#keyhive) | ✅ BeeKEM | ❌ | - | ❌ Rust | Pre-Alpha |
| [Loro](#loro) | ❌ Selbst | ❌ | ✅ Eigenes | ✅ WASM+Swift | Produktiv |
| [Yjs](#yjs) | ❌ Selbst | ❌ | ✅ Eigenes | ✅ | Produktiv |
| [Automerge](#automerge) | ❌ Selbst | ❌ | ✅ Eigenes | ⚠️ WASM | Produktiv |

### Kategorisierung

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Local-First + E2EE Landscape                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MIT DID-SUPPORT:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NextGraph     │ DID für User + Dokumente, RDF/SPARQL                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MIT EINGEBAUTEM E2EE (ohne DID):                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Evolu         │ BIP39 Mnemonic, SQLite, React Native                │   │
│  │ Jazz          │ Account Keys, CoJSON                                │   │
│  │ Secsync       │ XChaCha20-Poly1305, Framework-agnostisch            │   │
│  │ p2panda       │ Double Ratchet, modularer Rust-Stack                │   │
│  │ Keyhive       │ BeeKEM für Gruppen-Keys                             │   │
│  │ DXOS          │ HALO Protocol, Web-fokussiert                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CRDT-ONLY (E2EE selbst bauen):                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Loro          │ High-Performance, Rust + WASM + Swift               │   │
│  │ Yjs           │ Größte Community, viele Bindings                    │   │
│  │ Automerge     │ Elegantes API, Ink & Switch                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PROTOKOLLE (Framework-agnostisch):                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ossa Protocol │ Universal Sync Protocol (Prototyp)                  │   │
│  │ Braid (IETF)  │ HTTP-Erweiterung für Sync                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailanalysen

### NextGraph

> Decentralized, encrypted and local-first platform

**Website:** https://nextgraph.org/
**GitHub:** https://github.com/nextgraph-org/nextgraph-rs (73 ⭐)
**Status:** Alpha

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Identität** | DID für User und Dokumente |
| **E2EE** | Ja, mit W3C Data Integrity 1.0 Proofs |
| **CRDTs** | Yjs + Automerge integriert |
| **Datenmodell** | RDF + SPARQL, JSON, Rich Text |
| **Gruppen** | Permissioned Groups mit Revocation |
| **Sync** | P2P Pub/Sub mit kausaler Ordnung |
| **Sprachen** | Rust (76%), TypeScript, Svelte |
| **SDKs** | Node.js, Web, Python, Rust |

#### Bewertung für Web of Trust

```
Vorteile:
✅ DID-Support eingebaut (einziges Framework!)
✅ E2EE + Encryption at Rest
✅ W3C Data Integrity Proofs (wie unsere Attestations)
✅ Kein DNS, kein Single Point of Failure
✅ RDF ermöglicht semantische Queries

Nachteile:
⚠️ Noch Alpha - nicht produktionsreif
⚠️ Kleine Community (73 Stars)
⚠️ React Native Support unklar
⚠️ Rust-basiert → Integration aufwendiger
⚠️ Komplexes System (RDF, SPARQL)
```

**Empfehlung:** Beobachten. Philosophisch am nächsten, aber noch nicht reif genug.

---

### Evolu

> Local-first platform with E2EE and SQLite

**Website:** https://evolu.dev/
**GitHub:** https://github.com/evoluhq/evolu (~1.8k ⭐)
**Status:** Produktiv

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Identität** | BIP39 Mnemonic (wie Crypto-Wallets) |
| **E2EE** | Ja, Key aus Mnemonic abgeleitet |
| **CRDTs** | Eigene Implementierung |
| **Datenmodell** | SQLite mit TypeScript-Typen |
| **Sync** | Range-Based Set Reconciliation (RBSR) |
| **Sprachen** | TypeScript |
| **Plattformen** | Web, Electron, React Native |

#### Bewertung für Web of Trust

```
Vorteile:
✅ BIP39 Mnemonic = Recovery Phrase (passt zu unserem Konzept)
✅ React Native voll unterstützt
✅ SQLite = vertraute Queries (Kysely)
✅ E2EE eingebaut
✅ Produktionsreif, aktive Entwicklung
✅ Hardware-Key Support (Trezor via SLIP-21)

Nachteile:
⚠️ Kein DID-Support (muss selbst gebaut werden)
⚠️ SQL-Paradigma vs. Graph-Datenmodell
⚠️ Weniger elegant als pure CRDTs
```

**Empfehlung:** Primärer Kandidat für Prototyp. Pragmatisch, stabil, gute DX.

---

### Jazz

> Primitives for building local-first apps

**Website:** https://jazz.tools/
**GitHub:** https://github.com/garden-co/jazz
**Status:** Beta

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Identität** | Account Keys (Passphrase-basiert) |
| **E2EE** | Ja, mit Signatures |
| **CRDTs** | CoJSON (eigenes Format) |
| **Datenmodell** | Collaborative JSON ("CoValues") |
| **Gruppen** | Eingebaut mit Permissions |
| **Sprachen** | TypeScript |
| **Plattformen** | Web, React Native (dokumentiert) |

#### Bewertung für Web of Trust

```
Vorteile:
✅ Elegantes API ("feels like reactive local JSON")
✅ Gruppen mit Permissions eingebaut
✅ React Native dokumentiert
✅ Passphrase Recovery (ähnlich Mnemonic)
✅ Aktive Entwicklung

Nachteile:
⚠️ Kein DID-Support
⚠️ Noch Beta
⚠️ CoJSON ist proprietär
⚠️ Weniger Kontrolle über Crypto
```

**Empfehlung:** Alternative zu Evolu. Eleganter, aber weniger ausgereift.

---

### Secsync

> Architecture for E2E encrypted CRDTs

**Website:** https://secsync.com/
**GitHub:** https://github.com/nikgraf/secsync (225 ⭐)
**Status:** Beta

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Identität** | Ed25519 Keys (extern verwaltet) |
| **E2EE** | XChaCha20-Poly1305-IETF |
| **CRDTs** | Agnostisch (Yjs, Automerge Beispiele) |
| **Konzept** | Snapshots + Updates + Ephemeral Messages |
| **Key Exchange** | Extern (Signal Protocol oder PKI) |
| **Sprachen** | TypeScript |

#### Bewertung für Web of Trust

```
Vorteile:
✅ Framework-agnostisch (Yjs oder Automerge)
✅ Saubere E2EE-Architektur dokumentiert
✅ Server sieht nur verschlüsselte Blobs
✅ Snapshot + Update Modell effizient

Nachteile:
⚠️ Key Exchange muss selbst gebaut werden
⚠️ React Native Support unklar
⚠️ Noch Beta
⚠️ Kleinere Community
```

**Empfehlung:** Gute Referenz-Architektur. Konzepte übernehmen, wenn wir selbst bauen.

---

### p2panda

> Modular framework for P2P applications

**Website:** https://p2panda.org/
**GitHub:** https://github.com/p2panda/p2panda
**Status:** Aktive Entwicklung

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Identität** | Ed25519 Keys |
| **E2EE** | Double Ratchet Algorithm |
| **CRDTs** | Beliebig (raw bytes) |
| **Module** | 9 separate Crates (Rust) |
| **Features** | Discovery, Sync, Blobs, Auth, Encryption |
| **Plattformen** | Desktop, Mobile (Flutter FFI) |

#### Bewertung für Web of Trust

```
Vorteile:
✅ Modularer Ansatz (pick what you need)
✅ Double Ratchet = Post-Compromise Security
✅ p2panda-auth für Gruppen-Permissions
✅ Unterstützt LoRa, Bluetooth, Shortwave (!!)
✅ EU-gefördert (NLNet)

Nachteile:
⚠️ Rust-basiert → FFI für React Native nötig
⚠️ Kein DID-Support
⚠️ Komplexer Stack
⚠️ Flutter-fokussiert, nicht React Native
```

**Empfehlung:** Interessant für extreme Offline-Szenarien. Module könnten einzeln nützlich sein.

---

### DXOS

> Decentralized developer platform

**Website:** https://dxos.org/
**GitHub:** https://github.com/dxos/dxos (483 ⭐)
**Status:** Produktiv

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Identität** | HALO Protocol (eigenes System) |
| **E2EE** | Ja, über ECHO Protocol |
| **CRDTs** | Yjs / Automerge via Adapter |
| **Datenmodell** | Graph-basiert (Spaces, Objects) |
| **Sync** | P2P via WebRTC |
| **Sprachen** | TypeScript |

#### Bewertung für Web of Trust

```
Vorteile:
✅ Graph-Modell passt zu Web of Trust
✅ Spaces-Konzept ähnlich unseren Gruppen
✅ Produktionsreif
✅ Gute TypeScript-Typen

Nachteile:
❌ Kein React Native Support
⚠️ Web-fokussiert
⚠️ Kein DID-Support
⚠️ Komplexes eigenes Protokoll
```

**Empfehlung:** Nicht für Mobile geeignet. Konzepte (Spaces, HALO) interessant.

---

### Keyhive

> Decentralized group key management

**Website:** https://www.inkandswitch.com/keyhive/
**GitHub:** https://github.com/inkandswitch/keyhive (177 ⭐)
**Status:** Pre-Alpha (Forschung)

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Fokus** | Gruppenkey-Management für Local-First |
| **Protokoll** | BeeKEM (basiert auf TreeKEM) |
| **Features** | Forward Secrecy, Post-Compromise Security |
| **Skalierung** | Logarithmisch (tausende Members) |
| **Sprachen** | Rust + WASM |

#### Bewertung für Web of Trust

```
Vorteile:
✅ Löst genau das Gruppenkey-Problem
✅ Von Ink & Switch (Automerge-Macher)
✅ Capability-basiertes Access Control
✅ Designed für CRDTs

Nachteile:
❌ Pre-Alpha, nicht auditiert
❌ Kein React Native
⚠️ Nur Key Management, kein vollständiges Framework
⚠️ API noch instabil
```

**Empfehlung:** Beobachten für Gruppen-Verschlüsselung. Könnte Evolu/Jazz ergänzen wenn stabil.

---

### Loro

> High-performance CRDT library

**Website:** https://loro.dev/
**GitHub:** https://github.com/loro-dev/loro
**Status:** Produktiv

#### Eigenschaften

| Aspekt | Details |
|--------|---------|
| **Fokus** | Performance-optimierte CRDTs |
| **Datentypen** | Map, List, Text, MovableTree |
| **Features** | Time Travel, Undo/Redo |
| **Sprachen** | Rust, WASM, Swift |
| **E2EE** | Nicht eingebaut |

#### Bewertung für Web of Trust

```
Vorteile:
✅ Beste Performance (Memory, CPU, Loading)
✅ MovableTree für hierarchische Daten
✅ Swift-Bindings für iOS
✅ Aktive Entwicklung

Nachteile:
❌ Kein E2EE (selbst bauen)
❌ Kein DID
⚠️ Nur CRDT-Engine, kein Sync
```

**Empfehlung:** Wenn wir CRDT-Engine selbst wählen, ist Loro der Performance-Champion.

---

### Yjs & Automerge

Klassische CRDT-Libraries, gut dokumentiert. Keine E2EE, kein DID.

| Aspekt | Yjs | Automerge |
|--------|-----|-----------|
| **Performance** | Sehr schnell | Gut |
| **Bundle Size** | ~50KB | ~200KB (WASM) |
| **Community** | Sehr groß | Groß |
| **Bindings** | Viele (Prosemirror, Monaco) | Weniger |
| **React Native** | Ja | WASM nötig |

**Empfehlung:** Gute Basis wenn wir E2EE selbst bauen wollen.

---

## Warum haben diese Frameworks keinen DID-Support?

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Unterschiedliche Design-Philosophien                    │
│     • Local-First: Geschlossenes Ökosystem                 │
│     • DIDs: Universelle Interoperabilität                  │
│                                                             │
│  2. DIDs sind "zu viel" für ihren Usecase                  │
│     • Sie brauchen nur Public Key für Crypto                │
│     • DID Document ist Overhead                             │
│                                                             │
│  3. Resolver-Problem                                        │
│     • did:web braucht HTTP (nicht offline-first!)          │
│     • did:key ist self-describing, aber warum DID-String?  │
│                                                             │
│  4. Historische Entwicklung                                 │
│     • CRDTs und DIDs entwickelten sich parallel            │
│     • Welten treffen sich erst jetzt                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Unsere Lösung: DID-Layer über Framework

```typescript
// Framework speichert Bytes, wir interpretieren als DID

class WotIdentity {
  private keyPair: KeyPair;

  // Für externe Systeme: DID
  get did(): string {
    return publicKeyToDid(this.keyPair.publicKey);
  }

  // Für Framework-interne Nutzung
  get publicKey(): Uint8Array {
    return this.keyPair.publicKey;
  }
}
```

---

## Framework-Agnostische Architektur

### Schichten-Modell

```
┌─────────────────────────────────────────────────────────────┐
│                     WoT Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              WoT Domain Layer                        │   │
│  │  • Identity, Contact, Verification, Attestation     │   │
│  │  • Item, Group, AutoGroup                           │   │
│  │  • Business Logic (Empfänger-Prinzip)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              WoT Adapter Interfaces                  │   │
│  │  • WotStorage (Lesen/Schreiben/Sync)                │   │
│  │  • WotCrypto (Signing/Encryption/DID)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           ▼               ▼               ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │EvoluAdapter │  │ JazzAdapter │  │CustomAdapter│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### WotStorage Interface

```typescript
interface WotStorage {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Identity (lokal, wird nicht synchronisiert)
  getIdentity(): Promise<Identity | null>;
  createIdentity(name: string): Promise<Identity>;

  // Contacts (abgeleitet aus Verifications)
  getContacts(): Promise<Contact[]>;
  getContactByDid(did: string): Promise<Contact | null>;

  // Verifications (Empfänger-Prinzip: ich empfange)
  getReceivedVerifications(): Promise<Verification[]>;
  saveReceivedVerification(v: Verification): Promise<void>;

  // Attestations (Empfänger-Prinzip: ich empfange)
  getReceivedAttestations(): Promise<Attestation[]>;
  saveReceivedAttestation(a: Attestation): Promise<void>;
  setAttestationHidden(id: string, hidden: boolean): Promise<void>;

  // Items (ich besitze)
  getItems(): Promise<Item[]>;
  saveItem(item: Item): Promise<void>;
  deleteItem(id: string): Promise<void>;

  // Sync Events
  onDataChanged(callback: (changes: Change[]) => void): () => void;
  getSyncStatus(): SyncStatus;
}

interface SyncStatus {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncedAt: Date | null;
}
```

### WotCrypto Interface

```typescript
interface WotCrypto {
  // Key Management
  generateKeyPair(): Promise<KeyPair>;
  deriveFromMnemonic(mnemonic: string): Promise<KeyPair>;
  generateMnemonic(): string;

  // Signing (Ed25519)
  sign(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  verify(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;

  // Encryption (X25519 + AES-256-GCM)
  encrypt(plaintext: Uint8Array, recipientPublicKeys: Uint8Array[]): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload, privateKey: Uint8Array): Promise<Uint8Array>;

  // DID Conversion
  publicKeyToDid(publicKey: Uint8Array): string;
  didToPublicKey(did: string): Uint8Array;
}
```

---

## Empfehlungen

### Tier 1: Primäre Kandidaten

| Framework | Usecase | Begründung |
|-----------|---------|------------|
| **Evolu** | Prototyp | Produktionsreif, React Native, BIP39 |
| **NextGraph** | Beobachten | Einziges mit DID, aber noch Alpha |

### Tier 2: Interessante Bausteine

| Framework | Usecase | Begründung |
|-----------|---------|------------|
| **Secsync** | Architektur-Referenz | Saubere E2EE-Dokumentation |
| **Keyhive** | Gruppen-Keys (später) | BeeKEM für Skalierung |
| **p2panda** | Extreme Offline | LoRa, Bluetooth Support |

### Tier 3: CRDT-Engines

| Framework | Usecase | Begründung |
|-----------|---------|------------|
| **Loro** | Performance | Schnellste Engine |
| **Yjs** | Community | Größtes Ökosystem |
| **Automerge** | Eleganz | Bestes API |

### Strategie

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Phase 1: Evolu-basierter Prototyp                         │
│  • WotStorage Interface implementieren                      │
│  • DID-Layer darüber bauen                                  │
│  • Validieren dass Konzepte funktionieren                   │
│                                                             │
│  Phase 2: Framework-Vergleich in der Praxis                │
│  • Jazz-Adapter als Alternative                             │
│  • Performance-Vergleich                                    │
│  • Community-Feedback                                       │
│                                                             │
│  Phase 3: Optimierung                                       │
│  • Keyhive für Gruppen-Keys (wenn stabil)                  │
│  • NextGraph evaluieren (wenn produktionsreif)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quellen

- [NextGraph](https://nextgraph.org/) - Decentralized, encrypted, local-first platform
- [Evolu](https://evolu.dev/) - Local-first platform with E2EE
- [Jazz](https://jazz.tools/) - Primitives for local-first apps
- [Secsync](https://github.com/nikgraf/secsync) - E2EE CRDT architecture
- [p2panda](https://p2panda.org/) - Modular P2P framework
- [DXOS](https://dxos.org/) - Decentralized developer platform
- [Keyhive](https://www.inkandswitch.com/keyhive/) - Group key management
- [Loro](https://loro.dev/) - High-performance CRDT library
- [Yjs](https://yjs.dev/) - Shared data types for collaboration
- [Automerge](https://automerge.org/) - JSON-like data structures that sync
- [Ossa Protocol](https://jamesparker.me/blog/post/2025/08/04/ossa-towards-the-next-generation-web) - Universal sync protocol
- [awesome-local-first](https://github.com/alexanderop/awesome-local-first) - Curated list

---

## Weiterführend

- [Sync-Protokoll](sync-protokoll.md) - Wie Offline-Änderungen synchronisiert werden
- [Verschlüsselung](verschluesselung.md) - E2E-Verschlüsselung im Detail
- [Datenmodell](../datenmodell/README.md) - Entitäten und ihre Beziehungen
