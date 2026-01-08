# Onboarding-Flow (Technische Perspektive)

> Wie eine neue Identität erstellt und ins Netzwerk integriert wird

## Übersicht: Onboarding-Architektur

```mermaid
flowchart TD
    subgraph External["Externe Systeme"]
        AppStore["App Store /<br/>Play Store"]
        Sync["Sync Server"]
    end
    
    subgraph Device["Bens Gerät"]
        Camera["Kamera"]
        App["Web of Trust App"]
        SecureStore["Secure Storage<br/>(Keychain/Keystore)"]
        LocalDB["Lokale Datenbank"]
    end
    
    subgraph Crypto["Kryptographie"]
        KeyGen["Key Generation"]
        DIDCreate["DID Creation"]
        BIP39["BIP39 Mnemonic"]
    end
    
    Camera -->|QR-Scan| App
    App -->|Download| AppStore
    App -->|Sync| Sync
    App -->|Private Key| SecureStore
    App -->|Contacts, Items| LocalDB
    App -->|Generate| KeyGen
    KeyGen -->|Create| DIDCreate
    KeyGen -->|Backup| BIP39
```

## Detailflow: ID-Erstellung

```mermaid
flowchart TD
    Start([Nutzer tippt<br/>"ID erstellen"]) --> Entropy[Sammle Entropie<br/>CSPRNG]
    
    Entropy --> GenMnemonic[Generiere BIP39<br/>Mnemonic<br/>12 Wörter]
    
    GenMnemonic --> DeriveSeed[Derive Seed<br/>von Mnemonic<br/>PBKDF2]
    
    DeriveSeed --> GenKeyPair[Generiere<br/>Ed25519 KeyPair<br/>von Seed]
    
    GenKeyPair --> CreateDID[Erstelle DID<br/>did:wot:hash]
    
    CreateDID --> StorePrivate[Speichere Private Key<br/>in Secure Storage]
    
    StorePrivate --> BlockNav["⛔ Blockiere Navigation<br/>(kein Zurück, kein Schließen)"]
    
    BlockNav --> ShowMnemonic["🔐 Zeige Mnemonic<br/>━━━━━━━━━━━━━━━━<br/>⚠️ EINMALIGE ANZEIGE<br/>Phrase wird NICHT<br/>gespeichert!"]
    
    ShowMnemonic --> UserChoice{Nutzer-Aktion}
    
    UserChoice -->|Bestätigt Sicherung| VerifyQuiz[Verifizierungs-Quiz<br/>3 Wörter abfragen]
    VerifyQuiz -->|Korrekt| MarkSecured[Markiere als<br/>"gesichert" ✅]
    VerifyQuiz -->|Falsch| ShowMnemonic
    
    UserChoice -->|Will ohne Sicherung<br/>fortfahren| ShowWarning["⚠️ KRITISCHE WARNUNG<br/>'Phrase wird NICHT erneut<br/>angezeigt. Bei Geräteverlust<br/>ist Identität VERLOREN.'"]
    
    ShowWarning --> Confirm{Risiko akzeptieren?}
    Confirm -->|Nein| ShowMnemonic
    Confirm -->|Ja| MarkUnsecured["Markiere als<br/>'NICHT gesichert' ⚠️<br/>→ Permanente Warnung"]
    
    MarkSecured --> CreateProfile[Erstelle lokales<br/>Profil-Dokument]
    MarkUnsecured --> CreateProfile
    
    CreateProfile --> SignProfile[Signiere Profil<br/>mit Private Key]
    
    SignProfile --> Ready([ID bereit])
    
    style ShowMnemonic fill:#FFF3CD,stroke:#FFD700
    style ShowWarning fill:#FFE4E4,stroke:#FF0000
    style MarkUnsecured fill:#FFE4E4,stroke:#FF0000
```

## Sequenzdiagramm: Vollständiges Onboarding

```mermaid
sequenceDiagram
    participant A_App as Anna's App
    participant QR as QR-Code
    participant B_Cam as Ben's Kamera
    participant Store as App Store
    participant B_App as Ben's App
    participant B_Secure as Ben's Secure Storage
    participant Sync as Sync Server

    Note over A_App,Sync: Phase 1: Einladung

    A_App->>QR: generateInviteQR()
    Note over QR: Enthält:<br/>- App Store Link<br/>- Anna's DID<br/>- Anna's Public Key<br/>- Invite Token (optional)
    
    B_Cam->>QR: scan()
    B_Cam->>B_Cam: parseQR()
    
    alt App nicht installiert
        B_Cam->>Store: openAppStore(link)
        Store->>B_App: install()
        B_App->>B_App: launch(deeplink)
        B_App->>B_App: parseDeeplink()<br/>→ {anna.did, anna.pk}
    else App installiert
        B_Cam->>B_App: openApp(deeplink)
        B_App->>B_App: parseDeeplink()
    end

    Note over A_App,Sync: Phase 2: Annas Profil laden

    alt Online
        B_App->>Sync: fetchProfile(anna.did)
        Sync->>B_App: {name, photo, bio, sig}
        B_App->>B_App: verifySignature(profile, anna.pk)
    else Offline
        B_App->>B_App: Zeige nur DID + Public Key Info
    end
    
    B_App->>B_App: displayInviter(anna)

    Note over A_App,Sync: Phase 3: ID erstellen

    B_App->>B_App: collectUserInput()<br/>name, photo, bio
    B_App->>B_App: generateEntropy(256bit)
    B_App->>B_App: createMnemonic(entropy)<br/>→ 12 words (BIP39)
    B_App->>B_App: deriveSeed(mnemonic)<br/>PBKDF2
    B_App->>B_App: generateKeyPair(seed)<br/>Ed25519
    B_App->>B_App: createDID(publicKey)<br/>did:wot:base58(hash(pk))
    
    B_App->>B_Secure: storePrivateKey(pk)
    B_Secure->>B_App: ok
    
    B_App->>B_App: displayMnemonic()
    B_App->>B_App: waitForBackupConfirmation()
    
    opt Phrase verifizieren
        B_App->>B_App: verifyMnemonicQuiz()
    end

    Note over A_App,Sync: Phase 4: Profil erstellen

    B_App->>B_App: createProfile()
    Note over B_App: {<br/>  did: "did:wot:ben...",<br/>  name: "Ben Schmidt",<br/>  photo: "base64...",<br/>  bio: "...",<br/>  publicKey: "ed25519:..."<br/>}
    
    B_App->>B_App: signProfile(privateKey)
    B_App->>B_App: storeProfile(local)

    Note over A_App,Sync: Phase 5: Gegenseitige Verifizierung

    B_App->>B_App: createVerification(anna.did)
    B_App->>B_App: storeContact(anna, "pending")
    
    B_App->>B_App: generateQR(ben.did, ben.pk)
    B_App->>A_App: [physischer QR-Scan]
    
    A_App->>A_App: parseQR() → {ben.did, ben.pk}
    A_App->>A_App: createVerification(ben.did)
    A_App->>A_App: storeContact(ben, "active")
    A_App->>A_App: addToAutoGroup(ben)
    A_App->>A_App: reencryptItemsForNewContact(ben)

    Note over A_App,Sync: Phase 6: Sync

    A_App->>Sync: push(verification, profile, itemKeys)
    B_App->>Sync: push(verification, profile)
    
    Sync->>B_App: pull() → anna's verification
    B_App->>B_App: updateContact(anna, "active")
    B_App->>B_App: addToAutoGroup(anna)
    
    Sync->>B_App: pull() → anna's itemKeys for ben
    B_App->>B_App: Now can decrypt anna's content
```

## Kryptographische Details

### Key Generation

```mermaid
flowchart LR
    subgraph Input
        CSPRNG["CSPRNG<br/>256 bit entropy"]
    end
    
    subgraph BIP39["BIP39 Process"]
        Checksum["Add checksum<br/>8 bits"]
        Split["Split into<br/>11-bit chunks"]
        Words["Map to<br/>wordlist"]
    end
    
    subgraph KeyDerivation["Key Derivation"]
        PBKDF2["PBKDF2<br/>2048 rounds"]
        Seed["512-bit seed"]
        Ed25519["Ed25519<br/>derive"]
    end
    
    subgraph Output
        PrivKey["Private Key<br/>32 bytes"]
        PubKey["Public Key<br/>32 bytes"]
        DID["DID<br/>did:wot:..."]
    end
    
    CSPRNG --> Checksum --> Split --> Words
    Words -->|"12 words"| PBKDF2
    PBKDF2 --> Seed --> Ed25519
    Ed25519 --> PrivKey
    Ed25519 --> PubKey
    PubKey -->|hash + encode| DID
```

### DID Structure

```
did:wot:7Hy3kPqR9mNx2Wb5vLz8
     │   └──────────────────── Base58 encoded
     │                         first 16 bytes of
     │                         SHA256(publicKey)
     └────────────────────────── Method name
```

### Profil-Signatur

```json
{
  "@context": "https://w3id.org/weboftrust/v1",
  "type": "Profile",
  "id": "did:wot:7Hy3kPqR9mNx2Wb5vLz8",
  "name": "Ben Schmidt",
  "photo": "ipfs://Qm...",
  "bio": "Neu in der Gegend",
  "publicKey": {
    "type": "Ed25519VerificationKey2020",
    "publicKeyMultibase": "z6Mkf..."
  },
  "updated": "2025-01-08T14:30:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "did:wot:7Hy3kPqR9mNx2Wb5vLz8#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9..."
  }
}
```

## Invite-QR vs. Standard-QR

### Standard-QR (für bestehende Nutzer)

```json
{
  "type": "wot-identity",
  "did": "did:wot:anna123",
  "pk": "ed25519:base64..."
}
```

### Invite-QR (für Onboarding)

```json
{
  "type": "wot-invite",
  "app": "https://weboftrust.app/download",
  "did": "did:wot:anna123",
  "pk": "ed25519:base64...",
  "token": "optional-invite-token"
}
```

Das `token` könnte für Analytics oder spezielle Invite-Flows genutzt werden (z.B. "Einladung von Kemal beim Straßenfest").

## Secure Storage

### Platform-spezifisch

| Platform | Storage | Details |
|----------|---------|---------|
| iOS | Keychain | `kSecClassKey`, Hardware-backed wenn verfügbar |
| Android | Keystore | `AndroidKeyStore`, TEE/Strongbox wenn verfügbar |
| Web | Web Crypto API + IndexedDB | `extractable: false`, Key nie als Raw exportierbar |

### Web Crypto API Details

```javascript
// Non-extractable Key generieren
const keyPair = await crypto.subtle.generateKey(
  { name: "Ed25519" },
  false,  // extractable = false → Key kann nie exportiert werden
  ["sign", "verify"]
);

// In IndexedDB speichern (CryptoKey-Objekt direkt)
const db = await openDB('wot-keys', 1);
await db.put('keys', keyPair.privateKey, 'privateKey');
await db.put('keys', keyPair.publicKey, 'publicKey');

// Key kann nur für sign/verify verwendet werden
const signature = await crypto.subtle.sign(
  { name: "Ed25519" },
  keyPair.privateKey,
  data
);
```

### Web-spezifische Risiken

| Risiko | Mitigation |
|--------|------------|
| "Browserdaten löschen" löscht Keys | ⚠️ Recovery-Phrase ist EINZIGER Weg zurück |
| Kein Cross-Device Sync | Nutzer muss auf jedem Gerät recovern |
| Browser-Update könnte brechen | Unwahrscheinlich, aber Monitoring nötig |

→ **Konsequenz:** Recovery-Phrase-Sicherung ist im Web noch kritischer als bei nativen Apps!

### Was wird gespeichert

```mermaid
flowchart TD
    subgraph SecureStorage["Secure Storage (verschlüsselt)"]
        PrivKey["Private Key<br/>(non-extractable auf Web)"]
    end
    
    subgraph LocalDB["Lokale Datenbank (verschlüsselt mit Device Key)"]
        Profile["Eigenes Profil"]
        Contacts["Kontakte + Public Keys"]
        Items["Items + Item Keys"]
        Groups["Gruppen + Group Keys"]
    end
    
    subgraph NeverStored["⚠️ NIE gespeichert - NUR EINMAL angezeigt"]
        Mnemonic["Recovery-Phrase<br/>(12 Wörter)<br/>━━━━━━━━━━━━━━━━<br/>Wird bei Generierung<br/>EINMALIG angezeigt.<br/>Danach NICHT mehr<br/>abrufbar!"]
    end
    
    style NeverStored fill:#FFE4E4,stroke:#FF0000
```

**KRITISCH:** Die Recovery-Phrase wird aus Sicherheitsgründen nirgendwo gespeichert. Sie wird dem Nutzer **exakt einmal** bei der ID-Erstellung angezeigt. Danach gibt es keine Möglichkeit, sie erneut anzuzeigen. Wenn der Nutzer sie nicht sichert und später den Zugang zum Gerät verliert, ist die Identität **unwiederbringlich verloren**.

## Fehlerbehandlung

### Onboarding-Abbruch

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    
    NotStarted --> AppInstalled: App installieren
    AppInstalled --> ProfileEntered: Profil eingeben
    ProfileEntered --> KeysGenerated: Keys generieren
    KeysGenerated --> MnemonicShown: Mnemonic anzeigen
    MnemonicShown --> BackupConfirmed: Backup bestätigen
    BackupConfirmed --> VerificationDone: Verifizierung
    VerificationDone --> [*]: ✅ Fertig
    
    NotStarted --> [*]: Abbruch → Kein Problem
    AppInstalled --> [*]: Abbruch → Kein Problem
    ProfileEntered --> [*]: Abbruch → Daten verworfen
    
    KeysGenerated --> CRITICAL: Abbruch
    MnemonicShown --> CRITICAL: Abbruch ohne Sicherung
    
    state CRITICAL {
        [*] --> Lost
        Lost: ⚠️ KRITISCH!
        Lost: ID existiert, aber
        Lost: Recovery-Phrase wurde
        Lost: nicht gesichert.
        Lost: ━━━━━━━━━━━━━━━━
        Lost: Phrase kann NICHT
        Lost: erneut angezeigt werden!
        Lost: ━━━━━━━━━━━━━━━━
        Lost: Bei Geräteverlust ist
        Lost: Identität VERLOREN.
    }
    
    BackupConfirmed --> PartialSetup: Abbruch
    state PartialSetup {
        [*] --> HasID
        HasID: ID + Backup vorhanden
        HasID --> CanContinue: Später fortsetzen
    }
```

### Abbruch während Mnemonic-Anzeige verhindern

```mermaid
flowchart TD
    ShowMnemonic([Mnemonic wird angezeigt]) --> Block["⛔ Navigation blockiert<br/>Kein Zurück-Button<br/>Kein App-Schließen-Dialog"]
    
    Block --> Options{Nutzer-Optionen}
    
    Options -->|Bestätigen| Confirm["'Ich habe die Phrase<br/>sicher notiert'"]
    Options -->|Abbrechen| Warning["⚠️ WARNUNG:<br/>'Diese Phrase wird<br/>NICHT erneut angezeigt.<br/>Ohne sie verlierst du<br/>bei Geräteverlust den<br/>Zugang zu deiner Identität<br/>UNWIEDERBRINGLICH.'"]
    
    Confirm --> Quiz["Verifizierungs-Quiz<br/>(empfohlen)"]
    Quiz --> Continue([Weiter im Onboarding])
    
    Warning --> ReallyCancel{"Wirklich ohne<br/>Sicherung fortfahren?"}
    ReallyCancel -->|Nein| ShowMnemonic
    ReallyCancel -->|Ja, Risiko akzeptiert| MarkUnsafe["Markiere Account als<br/>'Recovery nicht gesichert'"]
    MarkUnsafe --> ShowPermanentWarning["Permanente Warnung<br/>in der App"]
    ShowPermanentWarning --> Continue
```

### Permanente Warnung bei ungesicherter Phrase

Da die Phrase nicht erneut angezeigt werden kann, zeigt die App eine **permanente, nicht schließbare Warnung** wenn der Nutzer ohne Sicherung fortfährt:

```
┌─────────────────────────────────────────┐
│ ⚠️ WARNUNG: Recovery nicht gesichert    │
│                                         │
│ Deine Recovery-Phrase wurde nicht       │
│ gesichert. Bei Verlust dieses Geräts    │
│ oder Löschung der App-Daten ist deine   │
│ Identität UNWIEDERBRINGLICH verloren.   │
│                                         │
│ Diese Warnung kann nicht geschlossen    │
│ werden.                                 │
│                                         │
│ Einzige Lösung: Neue ID erstellen und   │
│ von allen Kontakten neu verifizieren    │
│ lassen.                                 │
└─────────────────────────────────────────┘
```

## Datenstrukturen

### Lokaler Onboarding-State

```json
{
  "onboardingState": {
    "step": "mnemonic_shown",
    "startedAt": "2025-01-08T14:00:00Z",
    "invitedBy": "did:wot:anna123",
    "profileDraft": {
      "name": "Ben Schmidt",
      "photo": null,
      "bio": ""
    },
    "keysGenerated": true,
    "mnemonicBackedUp": false,
    "reminderCount": 0
  }
}
```

### Nach Abschluss: User Record

```json
{
  "user": {
    "did": "did:wot:ben456",
    "name": "Ben Schmidt",
    "photo": "ipfs://Qm...",
    "bio": "Neu in der Gegend",
    "publicKey": "ed25519:base64...",
    "createdAt": "2025-01-08T14:30:00Z",
    "onboardedBy": "did:wot:anna123",
    "mnemonicBackedUp": true,
    "mnemonicBackedUpAt": "2025-01-08T14:35:00Z"
  }
}
```

## Sicherheitsüberlegungen

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Mnemonic abfotografiert | Warnung "Kein Screenshot" + OS-Screenshot-Schutz |
| Shoulder Surfing | Privater Raum empfohlen, Wörter können einzeln angezeigt werden |
| Malware auf Gerät | Secure Storage / Web Crypto nutzt Hardware-Isolation |
| Server-Kompromittierung | Private Key verlässt nie das Gerät |
| QR-Code-Fälschung | Profil ist signiert, Fälschung erkennbar |
| Browser-Daten gelöscht (Web) | Recovery über Mnemonic - **einziger Weg!** |

### Best Practices

1. **Mnemonic NUR EINMAL anzeigen** - Wird nirgendwo gespeichert, kann nicht erneut abgerufen werden
2. **Abbruch während Mnemonic-Anzeige verhindern** - Navigation blockieren bis bestätigt oder bewusst abgelehnt
3. **Kein Cloud-Backup des Keys** - Nur Mnemonic auf Papier
4. **Biometrie optional** - Für App-Entsperrung, nicht für Key-Zugriff
5. **Permanente Warnung** - Wenn Nutzer ohne Sicherung fortfährt, dauerhafte UI-Warnung

### Recovery-Szenario

```mermaid
flowchart TD
    Loss([Gerät verloren /<br/>Daten gelöscht]) --> HasPhrase{Recovery-Phrase<br/>gesichert?}
    
    HasPhrase -->|Ja| Recover[Neue App installieren<br/>→ "Wiederherstellen"<br/>→ 12 Wörter eingeben]
    Recover --> Restored[✅ Identität wiederhergestellt<br/>Alle Kontakte noch da<br/>Alle Attestationen noch da]
    
    HasPhrase -->|Nein| Lost[❌ Identität VERLOREN]
    Lost --> NewID[Einzige Option:<br/>Neue ID erstellen]
    NewID --> Reverify[Alle Kontakte müssen<br/>neu verifizieren]
    NewID --> LostAttestations[Alte Attestationen<br/>unwiederbringlich verloren]
    
    style Lost fill:#FF6B6B
    style LostAttestations fill:#FF6B6B
```
