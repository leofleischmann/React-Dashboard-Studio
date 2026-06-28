// Shared subscribe/notify primitives for the SDK's external stores.
//
// Every store fans changes out to a set of zero-arg listeners (the
// useSyncExternalStore contract). Two shapes recur:
//   - a flat set (one channel)          → createListenerSet
//   - a set keyed by string (per entity, per state key, …) → createKeyedListeners
//
// These reproduce the exact add/delete/notify semantics that used to be
// hand-written in each store (insertion-order iteration; keyed sets are dropped
// once empty), so adopting them is behaviour-preserving.

export type Listener = () => void;

export interface ListenerSet {
  /** Add a listener; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void;
  /** Call every current listener. */
  notify(): void;
  /** Current listener count. */
  readonly size: number;
}

export function createListenerSet(): ListenerSet {
  const listeners = new Set<Listener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of listeners) listener();
    },
    get size() {
      return listeners.size;
    },
  };
}

export interface KeyedListeners {
  /** Add a listener for `key`; returns an unsubscribe function. */
  subscribe(key: string, listener: Listener): () => void;
  /** Call every listener registered for `key`. */
  notify(key: string): void;
  /** Call every listener across all keys. */
  notifyAll(): void;
  /** Listener count for `key`. */
  size(key: string): number;
}

export function createKeyedListeners(): KeyedListeners {
  const map = new Map<string, Set<Listener>>();
  return {
    subscribe(key, listener) {
      let set = map.get(key);
      if (!set) {
        set = new Set();
        map.set(key, set);
      }
      set.add(listener);
      return () => {
        set!.delete(listener);
        if (set!.size === 0) map.delete(key);
      };
    },
    notify(key) {
      const set = map.get(key);
      if (!set) return;
      for (const listener of set) listener();
    },
    notifyAll() {
      for (const set of map.values()) {
        for (const listener of set) listener();
      }
    },
    size(key) {
      return map.get(key)?.size ?? 0;
    },
  };
}
