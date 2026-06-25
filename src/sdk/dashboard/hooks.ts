import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { hassStore } from '../hass/store';
import { dashboardStore } from './store';

function useHassUserScope(fallback = 'default'): string {
  const getSnapshot = useCallback(
    () => hassStore.getHass()?.user?.name ?? fallback,
    [fallback],
  );
  return useSyncExternalStore(hassStore.subscribeHassMeta, getSnapshot, () => fallback);
}

/**
 * Wraps the dashboard tree. Sets localStorage scope (per HA user by default).
 * Automatically applied in Studio preview — only needed for custom mount setups.
 */
export function DashboardProvider({
  children,
  scope,
}: {
  children: ReactNode;
  scope?: string;
}) {
  const autoScope = useHassUserScope();
  const effectiveScope = scope ?? autoScope;

  useEffect(() => {
    dashboardStore.setScope(effectiveScope);
  }, [effectiveScope]);

  return children;
}

function useDashboardStoreState<T>(
  key: string,
  initialValue: T,
  persistent: boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  useEffect(() => {
    dashboardStore.ensureKey(key, initialRef.current, persistent);
  }, [key, persistent]);

  const cacheRef = useRef(initialValue);

  const getSnapshot = useCallback(() => {
    const next = dashboardStore.getSnapshot(key, persistent, initialRef.current);
    const prev = cacheRef.current;
    if (Object.is(prev, next)) return prev;
    cacheRef.current = next;
    return next;
  }, [key, persistent]);

  const subscribe = useCallback(
    (listener: () => void) => dashboardStore.subscribe(key, listener),
    [key],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initialRef.current);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      dashboardStore.setKey(key, next, persistent, initialRef.current);
    },
    [key, persistent],
  );

  return [value, setValue];
}

/**
 * Shared in-memory state between dashboard widgets (resets on full page reload).
 *
 *   const [room, setRoom] = useDashboardState('selectedRoom', 'wohnzimmer');
 */
export function useDashboardState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  return useDashboardStoreState(key, initialValue, false);
}

/**
 * Dashboard state persisted in localStorage (survives reloads, scoped per HA user).
 *
 *   const [tab, setTab] = usePersistentState('activeTab', 'home');
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  return useDashboardStoreState(key, initialValue, true);
}

/** Remove a persistent key from memory and localStorage. */
export function clearPersistentState(key: string): void {
  dashboardStore.removeKey(key, true);
}

/** Current dashboard state scope (HA user name or `default`). */
export function useDashboardScope(): string {
  const autoScope = useHassUserScope();
  const getSnapshot = useCallback(
    () => dashboardStore.getScope() || autoScope,
    [autoScope],
  );
  return useSyncExternalStore(
    (listener) => dashboardStore.subscribe('__scope__', listener),
    getSnapshot,
    () => autoScope,
  );
}
