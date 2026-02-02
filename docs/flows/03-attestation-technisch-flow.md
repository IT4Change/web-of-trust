# Attestation-Flow (Technische Perspektive)

> Wie Attestationen erstellt, signiert und verteilt werden

## Datenmodell

```mermaid
erDiagram
    USER {
        string did PK
        string publicKey
        string name
    }

    ATTESTATION {
        string id PK "UUID"
        string fromDid FK "Signiert von"
        string toDid FK "Gespeichert bei"
        string claim "Freitext"
        string contextGroupId FK "Optional"
        datetime createdAt
        boolean hidden "Opt-out durch Empfaenger"
        string proof "Ed25519 Signatur"
    }

    TAG {
        string id PK
        string name
    }

    GROUP {
        string did PK
        string name
    }

    USER ||--o{ ATTESTATION : "empfaengt (to)"
    ATTESTATION }o--o{ TAG : "hat"
    ATTESTATION }o--o| GROUP : "im Kontext von"
```

> **Empfänger-Prinzip:** Attestationen werden beim Empfänger (`to`) gespeichert. Anna attestiert Ben → Attestation liegt bei **Ben**.

## Attestation-Dokument Struktur

Wird beim **Empfänger** (`to`) gespeichert:

```json
{
  "@context": "https://w3id.org/weboftrust/v1",
  "type": "Attestation",
  "id": "urn:uuid:550e8400-e29b-41d4-a716-446655440000",
  "from": "did:wot:anna123",
  "to": "did:wot:ben456",
  "claim": "Hat 3 Stunden im Gemeinschaftsgarten geholfen",
  "tags": ["garten", "helfen"],
  "context": "did:wot:group:gemeinschaftsgarten",
  "createdAt": "2025-01-08T14:32:00Z",
  "hidden": false,
  "proof": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "did:wot:anna123#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9SkqZMVPxAQpic7ndTEcnUn..."
  }
}
```

| Feld | Beschreibung |
|------|--------------|
| `from` | Wer hat attestiert (signiert) |
| `to` | Wer erhält die Attestation (Speicherort) |
| `hidden` | Empfänger kann ausblenden (Default: false) |

## Hauptflow: Attestation erstellen

```mermaid
flowchart TD
    Start(["Nutzer tippt Attestation erstellen"]) --> CheckContact{"Kontakt verifiziert?"}

    CheckContact -->|Nein| Error["Fehler: Nur fuer verifizierte Kontakte"]
    CheckContact -->|Ja| ShowForm["Zeige Formular"]

    ShowForm --> Input["Nutzer gibt ein: Claim, Tags, Gruppe"]

    Input --> Validate{"Eingaben valide?"}

    Validate -->|Nein| ShowForm
    Validate -->|Ja| BuildDoc["Baue Attestation-Dokument (from=ich, to=kontakt)"]

    BuildDoc --> Sign["Signiere mit Private Key"]

    Sign --> Queue["Sende an Empfaenger (to)"]

    Queue --> Notify["Erstelle Benachrichtigung fuer Empfaenger"]

    Notify --> Done(["Fertig"])
```

> **Hinweis:** Die Attestation wird direkt an den Empfänger gesendet und dort gespeichert. Der Sender behält keine lokale Kopie.

## Sequenzdiagramm: Attestation erstellen und verteilen

```mermaid
sequenceDiagram
    participant A_UI as Anna UI
    participant A_App as Anna App
    participant Sync as Sync Server
    participant B_App as Ben App
    participant B_Store as Ben Local Store
    participant B_UI as Ben UI

    A_UI->>A_App: openAttestationForm(ben.did)
    A_App->>A_App: checkContactStatus(ben.did)
    A_App->>A_UI: showForm()

    A_UI->>A_App: submitAttestation(claim, tags, group)

    A_App->>A_App: validateInput()
    A_App->>A_App: buildAttestationDoc(from=anna, to=ben)
    Note over A_App: id, from, to, claim, tags, context, createdAt

    A_App->>A_App: signAttestation(privateKey)
    Note over A_App: Fuegt proof-Objekt hinzu

    A_App->>Sync: pushAttestation(to=ben)
    Note over A_App: Attestation wird an Ben gesendet

    A_App->>A_UI: showSuccess()

    Sync->>B_App: notifyNewAttestation()
    B_App->>Sync: pullAttestation()
    B_App->>B_App: verifySignature(anna.publicKey)
    B_App->>B_Store: storeAttestation(hidden=false)
    Note over B_Store: Ben speichert die Attestation
    B_App->>B_UI: showNotification()
```

> **Empfänger-Prinzip:** Anna sendet die Attestation an Ben. Ben speichert sie in seinem Datenspeicher und kontrolliert die Sichtbarkeit (`hidden`).

## Detailflow: Signatur erstellen

```mermaid
flowchart TD
    Doc["Attestation-Dokument ohne proof"] --> Canonical["Kanonisiere JSON"]
    
    Canonical --> Hash["SHA-256 Hash"]
    
    Hash --> Sign["Ed25519 Sign mit Private Key"]
    
    Sign --> Encode["Base58 Encode"]
    
    Encode --> Proof["Erstelle proof-Objekt"]
    
    Proof --> Final["Fuege proof zu Dokument hinzu"]
```

### Kanonisierung

Bevor signiert wird, muss das JSON kanonisiert werden:

1. Keys alphabetisch sortieren
2. Keine Whitespace ausser in Strings
3. UTF-8 Encoding

```javascript
const canonical = JSON.stringify(doc, Object.keys(doc).sort());
const hash = sha256(canonical);
const signature = ed25519.sign(hash, privateKey);
const proofValue = base58.encode(signature);
```

## Detailflow: Signatur verifizieren

```mermaid
flowchart TD
    Receive["Empfange Attestation"] --> Extract["Extrahiere proof-Objekt"]
    
    Extract --> GetDoc["Dokument ohne proof"]
    
    GetDoc --> Canonical["Kanonisiere JSON"]
    
    Canonical --> Hash["SHA-256 Hash"]
    
    Hash --> Decode["Base58 Decode proofValue"]
    
    Decode --> GetKey["Hole Public Key von from-DID"]
    
    GetKey --> Verify{"Ed25519 Verify"}
    
    Verify -->|Gueltig| Accept["Attestation akzeptieren"]
    Verify -->|Ungueltig| Reject["Attestation ablehnen"]
```

## Verschluesselung und Verteilung

### Wer bekommt die Attestation?

Mit dem Empfänger-Prinzip ist die Verteilung einfacher:

```mermaid
flowchart TD
    A["Anna erstellt Attestation fuer Ben"] --> Sign["Signiere mit Annas Private Key"]

    Sign --> Encrypt["Verschluessele mit Bens Public Key"]

    Encrypt --> Send["Sende an Ben"]

    Send --> BenReceives["Ben empfaengt und speichert"]

    BenReceives --> BenShares["Ben teilt mit seiner Auto-Gruppe"]
```

### Sichtbarkeit nach Empfang

Ben kontrolliert, wer die Attestation sieht:

```mermaid
flowchart TD
    Receive["Ben empfaengt Attestation"] --> Store["Speichere lokal"]

    Store --> Default["hidden=false (Standard)"]

    Default --> Share["Teile mit Auto-Gruppe"]

    Share --> Visible["Sichtbar in Bens Profil"]

    Store --> Hide["Ben setzt hidden=true"]

    Hide --> Private["Nur Ben sieht die Attestation"]
```

### Item-Key Verschluesselung (beim Empfänger)

Nachdem Ben die Attestation empfangen hat, teilt er sie mit seiner Auto-Gruppe:

```mermaid
flowchart LR
    Attestation["Attestation bei Ben"] --> SymKey["Generiere Item Key AES-256"]

    SymKey --> EncContent["Verschluessele Attestation"]

    SymKey --> EncKey1["Item Key fuer Ben selbst"]
    SymKey --> EncKey2["Item Key fuer Bens Kontakt 1"]
    SymKey --> EncKey3["Item Key fuer Bens Kontakt 2"]
    SymKey --> EncKeyN["..."]

    EncContent --> Store["In Bens Sync-Queue"]
    EncKey1 --> Store
    EncKey2 --> Store
    EncKey3 --> Store
```

> **Hinweis:** Die Verschlüsselung erfolgt beim Empfänger (Ben), nicht beim Sender (Anna). Ben entscheidet, mit wem er die Attestation teilt.

## Tags und Suche

### Tag-Verwaltung

```mermaid
flowchart TD
    Input["Nutzer gibt Tags ein"] --> Check{"Tag existiert?"}
    
    Check -->|Ja| Use["Verwende existierenden Tag"]
    Check -->|Nein| Create["Erstelle neuen Tag lokal"]
    
    Use --> Attach["Fuege Tag zu Attestation hinzu"]
    Create --> Attach
    
    Attach --> Index["Aktualisiere lokalen Such-Index"]
```

### Vordefinierte Tags

```json
{
  "predefinedTags": [
    {"id": "helfen", "emoji": "🤝", "label": "Helfen"},
    {"id": "garten", "emoji": "🌱", "label": "Garten"},
    {"id": "handwerk", "emoji": "🔧", "label": "Handwerk"},
    {"id": "transport", "emoji": "🚗", "label": "Transport"},
    {"id": "beratung", "emoji": "💬", "label": "Beratung"},
    {"id": "kochen", "emoji": "🍳", "label": "Kochen"},
    {"id": "kinderbetreuung", "emoji": "👶", "label": "Kinderbetreuung"},
    {"id": "technik", "emoji": "💻", "label": "Technik"}
  ]
}
```

## Gruppen-Kontext

### Attestation mit Gruppen-Kontext

```mermaid
sequenceDiagram
    participant A as Anna
    participant App as App
    participant G as Gruppe Gemeinschaftsgarten

    A->>App: Erstelle Attestation fuer Ben
    A->>App: Waehle Gruppe Gemeinschaftsgarten
    
    App->>App: Pruefe: Ist Anna Mitglied der Gruppe?
    App->>App: Pruefe: Ist Ben Mitglied der Gruppe?
    
    alt Beide Mitglieder
        App->>App: Fuege context-Feld hinzu
        Note over App: context: did:wot:group:gemeinschaftsgarten
    else Nicht beide Mitglieder
        App->>A: Warnung: Gruppen-Kontext nicht moeglich
    end
```

### Gruppen-Kontext Bedeutung

| Mit Kontext | Ohne Kontext |
|-------------|--------------|
| Attestation ist im Rahmen der Gruppe entstanden | Allgemeine Attestation |
| Sichtbar fuer alle Gruppen-Mitglieder | Nur fuer direkte Kontakte |
| Kann in Gruppen-Statistiken auftauchen | Nur in persoenlichem Profil |

## Benachrichtigungen

### Benachrichtigung fuer Empfaenger

```json
{
  "type": "attestation_received",
  "from": "did:wot:anna123",
  "fromName": "Anna Mueller",
  "attestationId": "urn:uuid:550e8400...",
  "preview": "Hat 3 Stunden im Gemeinschaftsgarten geholfen",
  "createdAt": "2025-01-08T14:32:00Z"
}
```

### Benachrichtigungs-Flow

```mermaid
flowchart TD
    Create["Attestation erstellt"] --> Notify["Erstelle Notification-Objekt"]
    
    Notify --> Encrypt["Verschluessele nur fuer Empfaenger"]
    
    Encrypt --> Push["Push zum Server"]
    
    Push --> Server["Server speichert"]
    
    Server --> Pull["Empfaenger App pullt"]
    
    Pull --> Decrypt["Entschluesseln"]
    
    Decrypt --> Show["Zeige Benachrichtigung"]
```

## Validierung

### Eingabe-Validierung

| Feld | Validierung |
|------|-------------|
| claim | Min 5 Zeichen, Max 500 Zeichen |
| tags | Min 0, Max 5 Tags |
| context | Muss existierende Gruppe sein oder leer |

### Signatur-Validierung beim Empfang

```mermaid
flowchart TD
    Receive["Attestation empfangen"] --> V1{"from-DID bekannt?"}
    
    V1 -->|Nein| Reject1["Ablehnen: Unbekannter Ersteller"]
    V1 -->|Ja| V2{"to-DID ist eigene DID oder Kontakt?"}
    
    V2 -->|Nein| Reject2["Ablehnen: Nicht relevant"]
    V2 -->|Ja| V3{"Signatur gueltig?"}
    
    V3 -->|Nein| Reject3["Ablehnen: Ungueltige Signatur"]
    V3 -->|Ja| V4{"Timestamp plausibel?"}
    
    V4 -->|Nein| Reject4["Ablehnen: Timestamp in Zukunft oder zu alt"]
    V4 -->|Ja| Accept["Akzeptieren und speichern"]
```

## Speicher-Schema

### Lokale Datenbank

```sql
CREATE TABLE attestations (
    id TEXT PRIMARY KEY,
    from_did TEXT NOT NULL,
    to_did TEXT NOT NULL,
    claim TEXT NOT NULL,
    context_group_id TEXT,
    created_at DATETIME NOT NULL,
    signature TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attestation_tags (
    attestation_id TEXT,
    tag_id TEXT,
    PRIMARY KEY (attestation_id, tag_id)
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    is_predefined BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_attestations_to ON attestations(to_did);
CREATE INDEX idx_attestations_from ON attestations(from_did);
CREATE INDEX idx_attestations_context ON attestations(context_group_id);
```

## Abfragen

### Attestationen fuer eine Person

```javascript
// Alle Attestationen die Ben empfangen hat
const attestations = await db.attestations
  .where('to_did')
  .equals(ben.did)
  .toArray();
```

### Attestationen nach Tag filtern

```javascript
// Alle Attestationen mit Tag "garten"
const gartenAttestations = await db.attestation_tags
  .where('tag_id')
  .equals('garten')
  .toArray();
```

### Attestationen im Gruppen-Kontext

```javascript
// Alle Attestationen im Kontext der Gartengruppe
const groupAttestations = await db.attestations
  .where('context_group_id')
  .equals('did:wot:group:gemeinschaftsgarten')
  .toArray();
```

## Sicherheitsueberlegungen

### Spam-Schutz

| Massnahme | Beschreibung |
|-----------|--------------|
| Nur fuer Kontakte | Attestationen nur fuer verifizierte Kontakte |
| Rate Limiting | Max 10 Attestationen pro Stunde (Client-seitig) |
| Soziale Kontrolle | Wer spammt verliert Glaubwuerdigkeit |

### Manipulation

| Angriff | Schutz |
|---------|--------|
| Attestation faelschen | Signatur mit Private Key des Erstellers |
| Attestation aendern | Jede Aenderung invalidiert Signatur |
| Attestation loeschen | Empfaenger hat eigene Kopie |
| Falsche Behauptung | Nur soziale Konsequenzen moeglich |

### Unveraenderlichkeit

Attestationen sind bewusst **unveraenderlich**:

1. **Signatur:** Jede Aenderung wuerde die Signatur brechen
2. **Verteilt:** Mehrere Kopien existieren bei verschiedenen Nutzern
3. **Design:** Eine Aussage ueber die Vergangenheit kann nicht ungeschehen gemacht werden

Bei Fehlern: Neue korrigierende Attestation erstellen.
