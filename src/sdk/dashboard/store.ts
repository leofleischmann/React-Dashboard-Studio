type Listener = () => void;

const STORAGE_PREFIX = 'homeassistant_dashboard_studio:state:';

function storageKey(scope: string, key: string): string {
  return `${STORAGE_PREFIX}${scope}:${key}`;
}

function readStorage<T>(scope: string, key: string): T | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(storageKey(scope, key));
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch (err) {
    return undefined;
  }
}

function writeStorage(scope: string, key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(scope, key), JSON.stringify(value));
  } catch (err) {
  }
}

function removeStorage(scope: string, key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(scope, key));
  } catch {
    /* ignore */
  }
}

/**
 * Shared dashboard state — in-memory and optional localStorage persistence.
 * React hooks subscribe per key (useSyncExternalStore).
 */
class DashboardStore {
  private scope = 'default';
  private memory = new Map<string, unknown>();
  private persistentLoaded = new Set<string>();
  private listeners = new Map<string, Set<Listener>>();

  setScope(scope: string): void {
    if (scope === this.scope) return;
    this.scope = scope;
    this.memory.clear();
    this.persistentLoaded.clear();
    this.notifyAll();
    this.notify('__scope__');
  }

  getScope(): string {
    return this.scope;
  }

  private notify(key: string): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const listener of set) listener();
  }

  private notifyAll(): void {
    for (const set of this.listeners.values()) {
      for (const listener of set) listener();
    }
  }

  subscribe(key: string, listener: Listener): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(key);
    };
  }

  ensureKey<T>(key: string, initialValue: T, persistent: boolean): void {
    if (this.memory.has(key)) return;
    if (persistent) {
      if (!this.persistentLoaded.has(key)) {
        const stored = readStorage<T>(this.scope, key);
        this.persistentLoaded.add(key);
        if (stored !== undefined) {
          this.memory.set(key, stored);
          return;
        }
      }
    }
    this.memory.set(key, initialValue);
    if (persistent) writeStorage(this.scope, key, initialValue);
  }

  getSnapshot<T>(key: string, persistent: boolean, initialValue: T): T {
    if (!this.memory.has(key)) {
      if (persistent && !this.persistentLoaded.has(key)) {
        const stored = readStorage<T>(this.scope, key);
        this.persistentLoaded.add(key);
        if (stored !== undefined) {
          this.memory.set(key, stored);
          return stored;
        }
      }
      return initialValue;
    }
    return this.memory.get(key) as T;
  }

  setKey<T>(
    key: string,
    next: T | ((prev: T) => T),
    persistent: boolean,
    initialValue: T,
  ): void {
    const prev = this.getSnapshot(key, persistent, initialValue);
    const value =
      typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
    this.memory.set(key, value);
    if (persistent) {
      this.persistentLoaded.add(key);
      writeStorage(this.scope, key, value);
    }
    this.notify(key);
  }

  removeKey(key: string, persistent: boolean): void {
    this.memory.delete(key);
    this.persistentLoaded.delete(key);
    if (persistent) removeStorage(this.scope, key);
    this.notify(key);
  }
}

export const dashboardStore = new DashboardStore();
