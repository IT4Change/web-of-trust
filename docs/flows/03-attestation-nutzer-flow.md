# Attestation-Flow (Nutzer-Perspektive)

> Wie Nutzer Attestationen erstellen und ansehen

## Was ist eine Attestation?

Eine Attestation ist eine **signierte Aussage** einer Person über eine andere Person.

| Verifizierung | Attestation |
|---------------|-------------|
| "Ich habe diese Person getroffen" | "Diese Person hat X getan" |
| Identitätsbestätigung | Vertrauensaufbau |
| Einmalig pro Kontakt | Beliebig viele möglich |
| Binär (ja/nein) | Inhaltlich (was, wann, wo) |

## Hauptflow: Attestation erstellen

```mermaid
sequenceDiagram
    participant A as Anna
    participant App as Anna App
    participant B as Ben

    Note over A,B: Ben hat im Garten geholfen

    A->>App: Öffnet Bens Profil
    A->>App: Tippt Attestation erstellen
    
    App->>A: Zeigt Formular
    
    A->>App: Beschreibung eingeben
    Note over App: "Ben hat 3 Stunden im Gemeinschaftsgarten geholfen"
    
    A->>App: Tags auswählen
    Note over App: Garten, Helfen, Gemeinschaft
    
    A->>App: Optional: Gruppe auswählen
    Note over App: Gemeinschaftsgarten Sonnenberg
    
    A->>App: Tippt Attestation erstellen
    
    App->>App: Signiert mit Annas Private Key
    App->>App: Speichert lokal
    App->>App: Sync zum Server
    
    App->>A: Attestation erstellt!
    
    Note over B: Ben sieht neue Attestation in seinem Profil
```

## Variante: Schnelle Attestation (Danke-Button)

```mermaid
sequenceDiagram
    participant A as Anna
    participant App as Anna App

    Note over A: Ben hat gerade geholfen

    A->>App: Öffnet Bens Profil
    A->>App: Tippt Danke-Button
    
    App->>A: Schnell-Attestation Vorschläge
    Note over App: Hat geholfen, War freundlich, Gute Arbeit
    
    A->>App: Wählt Vorlage aus
    A->>App: Optional: Text anpassen
    A->>App: Tippt Senden
    
    App->>App: Erstellt und signiert Attestation
    
    App->>A: Danke gesendet!
```

## Was der Nutzer sieht

### Bens Profil mit Attestation-Button

```
┌─────────────────────────────────┐
│                                 │
│         📷 [Profilbild]         │
│                                 │
│          Ben Schmidt            │
│     "Neu in der Gegend"         │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Verifiziert am 08.01.25 ✅     │
│                                 │
│  12 Attestationen erhalten      │
│                                 │
├─────────────────────────────────┤
│                                 │
│  [ 👍 Danke ]  [ ✍️ Attestation ]│
│                                 │
├─────────────────────────────────┤
│                                 │
│  Letzte Attestationen:          │
│                                 │
│  "Hat beim Umzug geholfen"      │
│  von Tom · vor 3 Tagen          │
│                                 │
│  "Kennt sich mit Fahrrädern     │
│   aus"                          │
│  von Carla · vor 1 Woche        │
│                                 │
│  [ Alle anzeigen ]              │
│                                 │
└─────────────────────────────────┘
```

### Attestation erstellen - Formular

```
┌─────────────────────────────────┐
│                                 │
│  ✍️ Attestation für Ben          │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Was möchtest du bestätigen?    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Ben hat 3 Stunden im    │    │
│  │ Gemeinschaftsgarten     │    │
│  │ geholfen und dabei die  │    │
│  │ Tomaten gegossen.       │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  Tags (wähle passende):         │
│                                 │
│  [Garten] [Helfen] [Handwerk]   │
│  [Beratung] [Transport] [+Neu]  │
│                                 │
│  Im Kontext einer Gruppe?       │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Gemeinschaftsgarten  ▼  │    │
│  └─────────────────────────┘    │
│                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                 │
│  ℹ️ Attestationen können nicht   │
│    zurückgenommen werden.       │
│                                 │
│  [ Attestation erstellen ]      │
│                                 │
└─────────────────────────────────┘
```

### Schnell-Attestation (Danke)

```
┌─────────────────────────────────┐
│                                 │
│  👍 Danke an Ben                 │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Wofür möchtest du danken?      │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🌱 Hat im Garten        │    │
│  │    geholfen             │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🔧 Hat etwas repariert  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 📦 Hat beim Tragen      │    │
│  │    geholfen             │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 💬 War ein gutes        │    │
│  │    Gespräch             │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ ✍️ Eigenen Text          │    │
│  │    schreiben...         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### Attestation erstellt - Bestätigung

```
┌─────────────────────────────────┐
│                                 │
│         ✅ Attestation          │
│            erstellt!            │
│                                 │
├─────────────────────────────────┤
│                                 │
│  "Ben hat 3 Stunden im          │
│   Gemeinschaftsgarten           │
│   geholfen"                     │
│                                 │
│  Tags: Garten, Helfen           │
│  Gruppe: Gemeinschaftsgarten    │
│                                 │
│  Signiert: 08.01.25 14:32       │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Ben wird benachrichtigt.       │
│                                 │
│  [ Fertig ]                     │
│                                 │
└─────────────────────────────────┘
```

## Attestationen ansehen

### Eigene erhaltene Attestationen

```
┌─────────────────────────────────┐
│                                 │
│  📜 Meine Attestationen         │
│                                 │
│  Filtern: [Alle ▼] [Garten ▼]   │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │ "Hat 3 Stunden im       │    │
│  │  Garten geholfen"       │    │
│  │                         │    │
│  │  👩 Anna · 08.01.25      │    │
│  │  🏷️ Garten, Helfen       │    │
│  │  👥 Gemeinschaftsgarten  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ "Kennt sich super mit   │    │
│  │  Fahrrädern aus"        │    │
│  │                         │    │
│  │  👴 Tom · 05.01.25       │    │
│  │  🏷️ Handwerk, Fahrrad    │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ "Hat beim Umzug         │    │
│  │  geholfen - super       │    │
│  │  zuverlässig!"          │    │
│  │                         │    │
│  │  👩 Carla · 01.01.25     │    │
│  │  🏷️ Helfen, Transport    │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### Attestationen eines Kontakts ansehen

```
┌─────────────────────────────────┐
│                                 │
│  📜 Attestationen für Ben       │
│                                 │
│  23 Attestationen von           │
│  8 verschiedenen Personen       │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Häufigste Tags:                │
│                                 │
│  ████████████ Helfen (12)       │
│  ████████     Garten (8)        │
│  █████        Handwerk (5)      │
│  ███          Transport (3)     │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Von deinen Kontakten:          │
│                                 │
│  👩 Anna (3 Attestationen)      │
│  👴 Tom (2 Attestationen)       │
│  👩 Carla (1 Attestation)       │
│                                 │
│  Von anderen:                   │
│  👤 5 weitere Personen          │
│                                 │
├─────────────────────────────────┤
│                                 │
│  [ Alle Attestationen ]         │
│                                 │
└─────────────────────────────────┘
```

## Personas

### Kemal attestiert nach Reparatur-Café

```mermaid
sequenceDiagram
    participant K as Kemal
    participant App as App

    Note over K: Nach dem Reparatur-Café

    K->>App: Öffnet Teilnehmer-Liste
    
    loop Für jeden Helfer
        K->>App: Öffnet Profil
        K->>App: Tippt Danke
        K->>App: Wählt "Hat repariert"
        K->>App: Fügt Detail hinzu
        Note over App: "Hat 2 Fahrräder repariert"
        K->>App: Senden
    end
    
    Note over K: 5 Attestationen in 3 Minuten
```

### Greta bedankt sich bei Tom

```mermaid
sequenceDiagram
    participant G as Greta
    participant T as Tom
    participant App as App

    Note over G,T: Tom hat Greta bei der App geholfen

    G->>App: Öffnet Toms Profil
    G->>App: Sieht Danke-Button
    G->>App: Tippt Danke
    
    App->>G: Zeigt Schnell-Optionen
    
    G->>App: Wählt "War ein gutes Gespräch"
    G->>App: Senden
    
    App->>G: Danke gesendet!
    
    Note over T: Tom sieht Benachrichtigung
```

## Regeln und Einschränkungen

### Was Attestationen NICHT können

```mermaid
flowchart TD
    A["Attestation erstellt"] --> B{"Was passiert?"}

    B --> C["Kann NICHT gelöscht werden"]
    B --> D["Kann NICHT bearbeitet werden"]
    B --> E["Kann NICHT widerrufen werden"]

    C --> F["Attestation bleibt für immer"]
    D --> F
    E --> F

    F --> G["Aber: Empfänger kann sie ausblenden"]
```

> **Neu:** Der Empfänger kann unerwünschte Attestationen **ausblenden** (hidden=true). Sie bleiben gespeichert, sind aber nicht öffentlich sichtbar.

### Warum nicht löschbar?

| Grund | Erklärung |
|-------|-----------|
| Integrität | Signierte Aussagen sind unveränderlich |
| Vertrauen | Andere verlassen sich auf die Aussage |
| Missbrauch | Sonst könnte man positive Attestationen sammeln und dann löschen |

### Umgang mit falschen Attestationen

Wenn jemand etwas Falsches attestiert hat:

1. **Neue Attestation:** Eine korrigierende Attestation erstellen
2. **Kontakt ausblenden:** Wenn systematisch falsch attestiert wird
3. **Soziale Konsequenz:** Wer falsch attestiert, verliert Glaubwürdigkeit

## Sichtbarkeit von Attestationen

Mit dem **Empfänger-Prinzip** wird die Attestation bei Ben gespeichert – er kontrolliert die Sichtbarkeit:

```mermaid
flowchart TD
    A["Anna erstellt Attestation für Ben"] --> B["Attestation wird bei Ben gespeichert"]

    B --> C{"Ben kann entscheiden"}

    C --> D["Sichtbar lassen (Standard)"]
    C --> E["Ausblenden (hidden=true)"]

    D --> F["Bens Kontakte sehen sie in seinem Profil"]
    E --> G["Nur Ben selbst sieht sie"]
```

### Sichtbarkeits-Matrix

| Betrachter | Sieht Attestation? | Warum? |
|------------|-------------------|--------|
| Ben (Empfänger) | ✅ Immer | Ist sein Profil, er kontrolliert Sichtbarkeit |
| Bens Kontakte | ✅ Wenn nicht hidden | Teil von Bens Profil |
| Anna (Ersteller) | ✅ Wenn Ben's Kontakt | Sieht Ben's Profil |
| Fremde | ❌ Nein | Nicht in Ben's Netzwerk |

> **Hinweis:** Ben kann unerwünschte Attestationen ausblenden, aber nicht löschen. Die Signatur von Anna bleibt gültig.
