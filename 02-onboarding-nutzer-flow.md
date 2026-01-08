# Onboarding-Flow (Nutzer-Perspektive)

> Wie ein neuer Nutzer ins Netzwerk kommt

## Übersicht: Zwei Wege ins Netzwerk

```mermaid
flowchart TD
    Start([Neue Person<br/>will beitreten]) --> How{Wie?}
    
    How -->|Eingeladen| Invited[Wird von bestehendem<br/>Nutzer gescannt]
    How -->|Selbstständig| Solo[Erstellt ID alleine]
    
    Invited --> Verify[Gegenseitige<br/>Verifizierung]
    Verify --> Connected[✅ Sofort vernetzt<br/>Sieht Content]
    
    Solo --> Alone[Hat ID aber<br/>leeres Netzwerk]
    Alone --> Later[Muss später Menschen<br/>treffen & verifizieren]
    Later --> Connected
    
    style Connected fill:#90EE90
    style Alone fill:#FFE4B5
```

## Hauptflow: Onboarding durch Einladung (Empfohlen)

```mermaid
sequenceDiagram
    participant A as 👩 Anna<br/>(Einladende)
    participant B as 👨 Ben<br/>(Neu)

    Note over A,B: 🤝 Persönliches Treffen

    A->>B: "Kennst du Web of Trust?<br/>Ich kann dich einladen"
    B->>A: "Nee, was ist das?"
    A->>B: "Eine App für unsere<br/>Nachbarschaft. Scann mal."
    
    rect rgb(230, 245, 255)
        Note over A,B: Phase 1: App installieren
        A->>A: Zeigt QR-Code
        B->>B: Scannt mit Handy-Kamera
        B->>B: Link öffnet App Store
        B->>B: Installiert App
        B->>B: Öffnet App
    end

    rect rgb(255, 245, 230)
        Note over A,B: Phase 2: Annas Profil sehen
        B->>B: App erkennt: "Du wurdest eingeladen"
        B->>B: Sieht Annas Profil
        Note over B: Name, Foto, Bio<br/>"Aktiv im Gemeinschaftsgarten"<br/>"23 Attestationen"
    end

    rect rgb(245, 230, 255)
        Note over A,B: Phase 3: Eigene ID erstellen
        B->>B: "Um beizutreten,<br/>erstelle deine Identität"
        B->>B: Gibt Namen ein
        B->>B: Optional: Foto, Bio
        B->>B: Tippt "ID erstellen"
        Note over B: 🔐 Schlüssel werden<br/>generiert
    end

    rect rgb(255, 230, 230)
        Note over A,B: Phase 4: Recovery-Phrase sichern (EINMALIG!)
        B->>B: Sieht Recovery-Phrase<br/>(12 Wörter)
        Note over B: ⚠️ KRITISCH<br/>"Diese Wörter werden<br/>NUR JETZT angezeigt!<br/>Schreib sie JETZT auf."
        B->>B: Schreibt Wörter auf
        B->>B: Bestätigt: "Ich habe sie gesichert"
        B->>B: Verifizierungs-Quiz<br/>(3 Wörter abfragen)
    end

    rect rgb(230, 255, 230)
        Note over A,B: Phase 5: Gegenseitige Verifizierung
        B->>B: Tippt "Anna bestätigen"
        B->>B: Zeigt eigenen QR-Code
        B->>A: "Jetzt scannst du mich"
        A->>B: Scannt Bens QR
        A->>A: Sieht Bens neues Profil
        A->>A: Tippt "Identität bestätigen"
    end

    Note over A,B: ✅ Ben ist im Netzwerk!
    Note over B: Sieht Annas Content<br/>Kann eigenen Content teilen
```

## Variante: Selbstständiges Onboarding

```mermaid
sequenceDiagram
    participant B as 👨 Ben<br/>(alleine)

    Note over B: 📱 Findet App im Store

    B->>B: Installiert App
    B->>B: Öffnet App
    
    rect rgb(245, 230, 255)
        Note over B: Eigene ID erstellen
        B->>B: "Willkommen bei Web of Trust"
        B->>B: "Erstelle deine Identität"
        B->>B: Gibt Namen ein
        B->>B: Optional: Foto, Bio
        B->>B: Tippt "ID erstellen"
    end

    rect rgb(255, 230, 230)
        Note over B: Recovery-Phrase sichern
        B->>B: Sieht Recovery-Phrase
        B->>B: Schreibt sie auf
        B->>B: Bestätigt Sicherung
    end

    rect rgb(255, 250, 230)
        Note over B: Leeres Netzwerk
        B->>B: Sieht Dashboard
        Note over B: "Du hast noch keine Kontakte.<br/>Triff jemanden mit Web of Trust<br/>oder lade jemanden ein."
        B->>B: Kann eigenes Profil bearbeiten
        B->>B: Kann QR-Code zeigen
        B->>B: Sieht keinen Content
    end

    Note over B: ⏳ Wartet auf echte Begegnungen
```

## Was der Nutzer sieht

### Willkommens-Screen (eingeladen)

```
┌─────────────────────────────────┐
│                                 │
│      🌐 Web of Trust            │
│                                 │
│   Du wurdest eingeladen von:    │
│                                 │
│         📷 [Profilbild]         │
│          Anna Müller            │
│                                 │
│   "Aktiv im Gemeinschafts-      │
│    garten Sonnenberg"           │
│                                 │
│   ✅ 23 Attestationen           │
│   ✅ 47 Verifizierungen         │
│                                 │
├─────────────────────────────────┤
│                                 │
│   [ Jetzt beitreten ]           │
│                                 │
│   Was ist Web of Trust? ℹ️       │
│                                 │
└─────────────────────────────────┘
```

### Profil erstellen

```
┌─────────────────────────────────┐
│                                 │
│   Erstelle dein Profil          │
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │     📷 Foto hinzufügen  │   │
│   │       (optional)        │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   Name *                        │
│   ┌─────────────────────────┐   │
│   │ Ben Schmidt             │   │
│   └─────────────────────────┘   │
│                                 │
│   Über mich (optional)          │
│   ┌─────────────────────────┐   │
│   │ Neu in der Gegend,      │   │
│   │ interessiert an...      │   │
│   └─────────────────────────┘   │
│                                 │
│   [ Weiter ]                    │
│                                 │
└─────────────────────────────────┘
```

### Recovery-Phrase (KRITISCH)

```
┌─────────────────────────────────┐
│                                 │
│   🔐 Deine Recovery-Phrase      │
│                                 │
│   ⚠️  WICHTIG - LIES DAS!       │
│                                 │
│   Diese 12 Wörter werden dir    │
│   NUR JETZT angezeigt.          │
│   Sie können NICHT erneut       │
│   abgerufen werden!             │
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │  1. apple    7. forest  │   │
│   │  2. banana   8. garden  │   │
│   │  3. cherry   9. house   │   │
│   │  4. delta   10. iron    │   │
│   │  5. echo    11. jungle  │   │
│   │  6. frog    12. kite    │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   📝 Schreib sie JETZT auf      │
│   🚫 Mach keinen Screenshot     │
│   🔒 Bewahre sie sicher auf     │
│                                 │
│   [ Ich habe sie gesichert ]    │
│                                 │
│   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈   │
│   Ohne Sicherung fortfahren     │
│   (nicht empfohlen)             │
│                                 │
└─────────────────────────────────┘
```

### Phrase verifizieren (optional aber empfohlen)

```
┌─────────────────────────────────┐
│                                 │
│   Überprüfen wir das kurz       │
│                                 │
│   Welches ist Wort Nummer 4?    │
│                                 │
│   ┌─────────┐ ┌─────────┐       │
│   │  delta  │ │  echo   │       │
│   └─────────┘ └─────────┘       │
│   ┌─────────┐ ┌─────────┐       │
│   │  frog   │ │  apple  │       │
│   └─────────┘ └─────────┘       │
│                                 │
└─────────────────────────────────┘
```

### Erster Kontakt bestätigen

```
┌─────────────────────────────────┐
│                                 │
│   ✅ Deine ID wurde erstellt!   │
│                                 │
│   Jetzt noch Anna bestätigen:   │
│                                 │
│         📷 [Annas Bild]         │
│          Anna Müller            │
│                                 │
│   Ist das die Person, die       │
│   dir gerade gegenübersteht?    │
│                                 │
│   [ Ja, Identität bestätigen ]  │
│                                 │
│   [ Nein, abbrechen ]           │
│                                 │
└─────────────────────────────────┘
```

### QR-Code zeigen

```
┌─────────────────────────────────┐
│                                 │
│   Fast geschafft!               │
│                                 │
│   Zeig Anna diesen Code:        │
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │      ▄▄▄▄▄▄▄▄▄▄▄       │   │
│   │      █ QR-CODE █       │   │
│   │      █         █       │   │
│   │      ▀▀▀▀▀▀▀▀▀▀▀       │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   Ben Schmidt                   │
│   did:wot:b3n5chm1dt...        │
│                                 │
│   "Jetzt scannst du mich"       │
│                                 │
└─────────────────────────────────┘
```

### Willkommen im Netzwerk

```
┌─────────────────────────────────┐
│                                 │
│   🎉 Willkommen im Netzwerk!    │
│                                 │
│   Du bist jetzt verbunden mit:  │
│                                 │
│   👩 Anna Müller                │
│                                 │
├─────────────────────────────────┤
│                                 │
│   Nächste Schritte:             │
│                                 │
│   📅 Annas Termine ansehen      │
│                                 │
│   🗺️  Orte in der Nähe          │
│                                 │
│   👥 Mehr Menschen treffen      │
│                                 │
│   [ Los geht's ]                │
│                                 │
└─────────────────────────────────┘
```

## Personas im Onboarding

### 🌱 Greta (62) - braucht Hilfe

```mermaid
sequenceDiagram
    participant T as 👴 Tom<br/>(Nachbar, hilft)
    participant G as 🌱 Greta<br/>(nicht technikaffin)

    T->>G: "Greta, ich zeig dir<br/>die neue Garten-App"
    G->>T: "Ich bin nicht so gut<br/>mit Technik..."
    T->>G: "Kein Problem, ich<br/>helfe dir durch"
    
    T->>T: Zeigt QR-Code
    T->>G: "Halt dein Handy<br/>hier drauf"
    G->>G: Scannt (mit Hilfe)
    
    Note over G: App Store öffnet
    T->>G: "Jetzt auf 'Installieren'"
    G->>G: Installiert
    
    Note over G: App öffnet
    T->>G: "Siehst du mein Bild?<br/>Tipp auf 'Beitreten'"
    G->>G: Tippt
    
    Note over G: Name eingeben
    T->>G: "Gib deinen Namen ein"
    G->>G: "Greta" eingeben
    
    Note over G: ⚠️ Recovery-Phrase
    T->>G: "Jetzt kommt das Wichtigste.<br/>Hast du Stift und Papier?"
    G->>G: Holt Notizbuch
    T->>G: "Diese 12 Wörter werden<br/>nur JETZT angezeigt.<br/>Schreib sie genau so auf."
    G->>G: Schreibt auf
    T->>G: "Prüf nochmal ob alles<br/>richtig ist. Das ist wie<br/>ein Ersatzschlüssel."
    T->>G: "Bewahr das gut auf,<br/>getrennt vom Handy."
    
    Note over T,G: Rest wie normaler Flow
```

### 👨‍👩‍👧 Familie Yilmaz - Straßenfest

```mermaid
sequenceDiagram
    participant K as 🔧 Kemal<br/>(Organisator)
    participant F as 👨‍👩‍👧 Familie Yilmaz

    Note over K,F: 🎪 Straßenfest, Info-Stand

    K->>F: "Neu in der Gegend?<br/>Willkommen!"
    F->>K: "Ja, wir kennen<br/>noch niemanden"
    K->>F: "Wir haben eine App für<br/>Nachbarschaftshilfe"
    
    K->>K: Zeigt QR-Code
    F->>F: Ein Familienmitglied scannt
    F->>F: Durchläuft Onboarding
    
    K->>K: Verifiziert Familie
    
    K->>F: "Jetzt seht ihr wer<br/>was anbieten kann"
    K->>F: "Wenn ihr Hilfe braucht<br/>oder anbieten wollt..."
    
    Note over F: Sieht sofort:<br/>- Gartengruppe<br/>- Babysitter-Liste<br/>- Handwerker-Kontakte
```

## Edge Cases

### Abbruch während Onboarding

```mermaid
flowchart TD
    Start([Onboarding startet]) --> Step1[App installiert]
    Step1 --> Step2[Profil angelegt]
    Step2 --> Step3[ID generiert]
    Step3 --> Step4[Recovery-Phrase angezeigt]
    Step4 --> Step5[Backup bestätigt]
    Step5 --> Step6[Verifizierung]
    
    Step1 -->|Abbruch| Cancel1[Kein Problem<br/>Nichts passiert]
    Step2 -->|Abbruch| Cancel2[Profil verworfen<br/>Neustart möglich]
    
    Step3 -->|Abbruch| Cancel3["⚠️ KRITISCH!<br/>ID existiert, aber<br/>Recovery-Phrase wurde<br/>noch nicht angezeigt"]
    
    Step4 -->|Abbruch ohne<br/>Sicherung| Cancel4["⚠️ KRITISCH!<br/>Phrase wurde angezeigt<br/>aber nicht gesichert.<br/>Kann NICHT erneut<br/>angezeigt werden!"]
    
    Step5 -->|Abbruch| Cancel5[ID + Backup vorhanden<br/>Später fortsetzbar]
    Step6 -->|Abbruch| Cancel6[Status: Pending<br/>Später fortsetzbar]
    
    style Cancel3 fill:#FFB6C1
    style Cancel4 fill:#FF6B6B
```

**Wichtig:** Nach Schritt 3 (ID generiert) sollte die App das Schließen/Zurückgehen blockieren bis die Recovery-Phrase mindestens angezeigt wurde. Der Nutzer muss bewusst entscheiden, ob er sichern will oder das Risiko akzeptiert.

### Recovery-Phrase nicht gesichert

Wenn der Nutzer ohne Sicherung fortfährt, wird eine **permanente Warnung** angezeigt:

```
┌─────────────────────────────────┐
│                                 │
│   ⚠️ WARNUNG                    │
│                                 │
│   Deine Recovery-Phrase wurde   │
│   NICHT gesichert.              │
│                                 │
│   Sie kann NICHT erneut         │
│   angezeigt werden.             │
│                                 │
│   Bei Verlust dieses Geräts     │
│   oder Löschung der Browser-    │
│   daten ist deine Identität     │
│   UNWIEDERBRINGLICH verloren.   │
│                                 │
│   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈   │
│   Diese Warnung kann nicht      │
│   geschlossen werden.           │
│                                 │
└─────────────────────────────────┘
```

Diese Warnung erscheint **dauerhaft** in der App (z.B. als Banner) und kann nicht weggeklickt werden.
