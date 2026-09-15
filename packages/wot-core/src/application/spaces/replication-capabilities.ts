import type {
  MembershipActivityCapable,
  SecureSelfLeaveCapable,
  DeterministicPrivateSpaceCapable,
  NamedRootsCapable,
} from '../../ports/ReplicationAdapter'

// Runtime type guards for the OPTIONAL replication-adapter capabilities. They
// live in the application layer (not in ports/) so the ports tree stays
// type-only; the capability interfaces themselves remain port contracts.

/** Optional capability: membership changes with an attached activity entry. */
export function hasMembershipActivity(value: unknown): value is MembershipActivityCapable {
  return typeof (value as MembershipActivityCapable | null)?.addMemberWithActivity === 'function'
    && typeof (value as MembershipActivityCapable | null)?.removeMemberWithActivity === 'function'
}

/** Optional capability: secure self-leave is fully wired, including durable recovery. */
export function hasSecureSelfLeave(value: unknown): value is SecureSelfLeaveCapable {
  return typeof (value as SecureSelfLeaveCapable | null)?.supportsSecureSelfLeave === 'function'
}

/** Optional capability: a SpaceHandle whose transactDurable proves the durable append of exactly its own transaction. */
export function hasDurableTransact<T>(handle: unknown): handle is { transactDurable(fn: (doc: T) => void): Promise<void> } {
  return typeof (handle as { transactDurable?: unknown } | null)?.transactDurable === 'function'
}

/** Optional capability: deterministic-genesis private space (Sync 001). */
export function hasDeterministicPrivateSpace(value: unknown): value is DeterministicPrivateSpaceCapable {
  return typeof (value as DeterministicPrivateSpaceCapable | null)?.openOrCreateDeterministicPrivateSpace === 'function'
}

// --- Typprobe: NamedRootsCapable muss ein `interface` als R akzeptieren ---
// Nur Typen, erzeugt keinen Code. rls#352 uebergibt ein `interface`; ein
// interface hat KEINE implizite Index-Signatur und erfuellt
// `Record<string, unknown>` deshalb nicht. Wird die Schranke in
// NamedRootsCapable wieder darauf verengt, schlaegt `tsc --noEmit` HIER fehl —
// nicht erst beim Verbraucher in einem anderen Repo.
interface NamedRootsInterfaceProbe {
  name: string
  tags: string[]
}
declare const namedRootsProbe: NamedRootsCapable
/** @internal Compile-Time-Zusage: `getRoot<SomeInterface>()` typisiert sauber. */
export type NamedRootsAcceptsInterface = ReturnType<typeof namedRootsProbe.getRoot<NamedRootsInterfaceProbe>>

/** Der `data`-Wurzeltyp des Space-Docs — nie als benannte Wurzel adressierbar. */
const DATA_ROOT_NAME = 'data'

/** Namensregel fuer benannte Wurzeln: `^[a-z][A-Za-z0-9]*$`, nicht `data`. */
const NAMED_ROOT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/

/**
 * Ist `name` ein zulaessiger Name fuer eine benannte Wurzel? Namen mit `_`
 * sind dem Adapter vorbehalten (`_meta`, `_members`, …) und fallen bereits
 * durch das Muster; `data` ist zusaetzlich ausgeschlossen.
 */
export function isValidNamedRootName(name: string): boolean {
  return typeof name === 'string' && name !== DATA_ROOT_NAME && NAMED_ROOT_NAME_PATTERN.test(name)
}

/**
 * Wirft synchron, wenn `name` keine zulaessige benannte Wurzel benennt. Jeder
 * Adapter, der die Capability anbietet, prueft ueber diese eine Stelle, damit
 * die Regel nicht driftet.
 */
export function assertValidNamedRootName(name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('named root: name must be a non-empty string')
  }
  if (name === DATA_ROOT_NAME) {
    throw new TypeError('named root: "data" is the space doc root and cannot be used as a named root')
  }
  if (name.startsWith('_')) {
    throw new TypeError(`named root: "${name}" is reserved for the adapter (names starting with "_")`)
  }
  if (!NAMED_ROOT_NAME_PATTERN.test(name)) {
    throw new TypeError(`named root: "${name}" must match ^[a-z][A-Za-z0-9]*$`)
  }
}

/**
 * Optional capability: ein SpaceHandle mit benannten Wurzel-Maps neben `data`.
 * Wurzeln kollidieren bei nebenlaeufiger Erstanlage nicht — im Gegensatz zu
 * verschachtelten Maps unter `data`.
 */
export function hasNamedRoots(handle: unknown): handle is NamedRootsCapable {
  const h = handle as NamedRootsCapable | null | undefined
  return typeof h?.getRoot === 'function'
    && typeof h?.transactRoot === 'function'
    && typeof h?.transactRootDurable === 'function'
}

/**
 * Definiert `key` als EIGENE, aufzaehlbare Daten-Property auf `target`. Eine
 * einfache Zuweisung wuerde bei `__proto__` den Prototyp setzen statt einen
 * Schluessel anzulegen — der Eintrag waere in der Projektion unsichtbar und
 * seine Felder wuerden stattdessen geerbt.
 */
function defineOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true })
}

/**
 * Schluessel, die eine Projektion am Prototyp statt am Objekt landen lassen
 * wuerden. Dieselbe Liste wie bei appData — und zusaetzlich unvermeidbar: Yjs
 * traegt eine eigene `__proto__`-Property nicht durch seinen Binaer-Codec (sie
 * ist nach encodeStateAsUpdate/applyUpdate weg). Ein Schluessel, der den Sync
 * nicht ueberlebt, darf gar nicht erst geschrieben werden — lieber laut
 * ablehnen als still verlieren.
 */
const FORBIDDEN_ROOT_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Wirft, wenn `key` als Schluessel in einer benannten Wurzel unzulaessig ist. */
export function assertValidNamedRootKey(key: string, path: string): void {
  if (FORBIDDEN_ROOT_KEYS.has(key)) {
    throw new TypeError(`named root key "${key}" at "${path}" is not allowed (it does not survive the CRDT codec)`)
  }
}

/** Friert einen bereits geklonten JSON-Wert tief ein — er verlaesst den Entwurf nur so. */
export function freezeDeep<V>(value: V): V {
  if (value === null || typeof value !== 'object') return value
  Object.freeze(value)
  for (const entry of Object.values(value as Record<string, unknown>)) freezeDeep(entry)
  return value
}

/**
 * Kanonische, TIEFE JSON-Kopie eines Wurzel-Werts — und zugleich die
 * Validierung des Wertvertrags benannter Wurzeln.
 *
 * Wirft auf JEDER Ebene bei allem, was kein JSON-Wert ist: Funktionen, Symbole,
 * BigInt, nicht-endliche Zahlen, Zyklen, Klassen-Instanzen ohne `toJSON`
 * (Map, Set, TypedArray …) und CRDT-Typen (ueber `isForeign` vom jeweiligen
 * Adapter gemeldet). Bewusst NICHT `JSON.stringify`: das verschluckt Funktionen
 * stillschweigend und macht aus `Infinity` ein `null` — der Wert waere dann
 * anders im Doc, als der Aufrufer geschrieben hat.
 *
 * JSON-Semantik dort, wo sie eindeutig ist: `undefined` als Objekt-Property
 * entfaellt (wie bei `JSON.stringify`), `undefined` als Array-Element wirft
 * (JSON wuerde daraus stillschweigend `null` machen), und `toJSON` wird
 * respektiert (Date → ISO-String).
 */
export function toJsonValue(
  value: unknown,
  path: string,
  isForeign?: (candidate: object) => boolean,
  seen: Set<object> = new Set(),
): unknown {
  if (value === null) return null
  const type = typeof value
  if (type === 'string' || type === 'boolean') return value
  if (type === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`named root value at "${path}" is not JSON-serializable (non-finite number)`)
    }
    return value
  }
  if (type !== 'object') {
    throw new TypeError(`named root value at "${path}" is not JSON-serializable (${type})`)
  }

  const obj = value as object
  if (isForeign?.(obj)) {
    throw new TypeError(`named root value at "${path}" must be plain JSON, not a CRDT type`)
  }
  if (seen.has(obj)) {
    throw new TypeError(`named root value at "${path}" is not JSON-serializable (circular reference)`)
  }

  const toJson = (obj as { toJSON?: unknown }).toJSON
  if (typeof toJson === 'function') {
    return toJsonValue((toJson as () => unknown).call(obj), path, isForeign, seen)
  }

  seen.add(obj)
  try {
    if (Array.isArray(obj)) {
      // Bewusst nicht `map`: das ueberspringt Loecher in sparse Arrays, und ein
      // Loch waere nach dem Binaer-Roundtrip ein `undefined` — also genau der
      // Wert, den die Regel eine Zeile weiter ablehnt.
      const out: unknown[] = []
      for (let index = 0; index < obj.length; index++) {
        const entry = obj[index]
        if (entry === undefined) {
          throw new TypeError(`named root value at "${path}[${index}]" is not JSON-serializable (undefined or a hole)`)
        }
        out.push(toJsonValue(entry, `${path}[${index}]`, isForeign, seen))
      }
      return out
    }
    const proto = Object.getPrototypeOf(obj)
    if (proto !== null && proto !== Object.prototype) {
      throw new TypeError(`named root value at "${path}" is not a plain JSON object`)
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      assertValidNamedRootKey(key, path)
      const entry = (obj as Record<string, unknown>)[key]
      if (entry === undefined) continue // JSON.stringify drops these too
      defineOwn(out, key, toJsonValue(entry, `${path}.${key}`, isForeign, seen))
    }
    return out
  } finally {
    seen.delete(obj)
  }
}

/**
 * Traegt einen bereits geklonten Wurzelwert prototyp-sicher in eine Projektion
 * ein. `__proto__` ist ein zulaessiger Wurzel-SCHLUESSEL (die Namensregel gilt
 * fuer den Wurzelnamen, nicht fuer die Schluessel darunter).
 */
export function defineRootKey(target: Record<string, unknown>, key: string, value: unknown): void {
  defineOwn(target, key, value)
}
