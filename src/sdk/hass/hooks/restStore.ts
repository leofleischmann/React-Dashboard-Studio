import { useCallback, useSyncExternalStore } from 'react';

/** Stable empty map for REST cache snapshots (useSyncExternalStore). */
export const EMPTY_REST_RECORD = Object.freeze({}) as Record<string, never>;

/**
 * Shared useSyncExternalStore wrapper for REST-backed hooks.
 * Returns a stable `inactiveSnapshot` while `active` is false.
 */
export function useSharedRestSubscribe<T>(
  active: boolean,
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T,
  serverSnapshot: T,
  inactiveSnapshot: T = serverSnapshot,
): T {
  const get = useCallback(
    () => (active ? getSnapshot() : inactiveSnapshot),
    [active, getSnapshot, inactiveSnapshot],
  );
  const sub = useCallback(
    (listener: () => void) => (active ? subscribe(listener) : () => {}),
    [active, subscribe],
  );
  return useSyncExternalStore(sub, get, () => serverSnapshot);
}

/** Data + pending flag from the same REST subscription. */
export function useSharedRestQuery<TData>(
  active: boolean,
  subscribe: (listener: () => void) => () => void,
  getDataSnapshot: () => TData,
  getPendingSnapshot: () => boolean,
  emptyData: TData,
): { data: TData; loading: boolean } {
  const loading = useSharedRestSubscribe(
    active,
    subscribe,
    getPendingSnapshot,
    false,
  );
  const data = useSharedRestSubscribe(
    active,
    subscribe,
    getDataSnapshot,
    emptyData,
  );
  return { data, loading };
}
