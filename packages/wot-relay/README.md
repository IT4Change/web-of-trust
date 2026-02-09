# @real-life/wot-relay

Minimaler WebSocket Relay Server für das Web-of-Trust Netzwerk.

## Was macht der Relay?

Der Relay leitet verschlüsselte Nachrichten zwischen Nutzern weiter. Er ist **blind** — er sieht nur wer sendet und wer empfängt (DIDs), aber nicht den Inhalt.

```
Alice                    Relay                     Bob
  |-- register(did_a) -->|                          |
  |<-- registered -------|                          |
  |                       |<-- register(did_b) -----|
  |                       |--- registered --------->|
  |-- send(envelope) --->|                          |
  |                       |--- message(envelope) -->|
  |<-- receipt(delivered) |                          |
```

## Design-Prinzipien

- **Blind:** Payload ist E2E-verschlüsselt. Der Relay kann nichts lesen.
- **Minimal:** Nur `ws` + `better-sqlite3`, kein Framework.
- **Offline Queue:** Nachrichten für offline Nutzer werden in SQLite gespeichert und bei Reconnect ausgeliefert.
- **Platzhalter:** Langfristig wird der Relay durch ein föderiertes Protokoll (z.B. Matrix) ersetzt.

## Protokoll

JSON über WebSocket mit vier Message-Typen:

```typescript
// Client → Relay
{ type: 'register', did: 'did:key:z6Mk...' }
{ type: 'send', envelope: MessageEnvelope }

// Relay → Client
{ type: 'registered', did: 'did:key:z6Mk...' }
{ type: 'message', envelope: MessageEnvelope }
{ type: 'receipt', receipt: DeliveryReceipt }
{ type: 'error', code: string, message: string }
```

## Starten

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

Default Port: `8080` (konfigurierbar über `PORT` Umgebungsvariable).

## Docker

```bash
docker compose up -d
```

## Tests

```bash
pnpm test
```

15 Tests: Register, Online-Delivery, Offline-Queue, Receipts, Error-Handling, Integration (Alice + Bob).

## Teil des Web-of-Trust Projekts

- [wot-core](../wot-core) — Kryptographie, Identität, Adapter
- [Demo App](../../apps/demo) — Interaktive Demo
- [Landing Page](../../apps/landing) — web-of-trust.de
