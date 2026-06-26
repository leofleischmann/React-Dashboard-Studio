import { useCallback, useSyncExternalStore } from 'react';
import { debugStore } from './store';

/** Author-side debug toggle (sessionStorage) — used in the Studio toolbar. */
export function useAuthorDebugEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    (listener) => debugStore.subscribe(listener),
    () => debugStore.getAuthorEnabled(),
    () => import.meta.env.DEV,
  );
  const setEnabled = useCallback((next: boolean) => {
    debugStore.setAuthorEnabled(next);
  }, []);
  return [enabled, setEnabled];
}

/** True when `db.*` would write to the browser console right now. */
export function useDebugActive(): boolean {
  return useSyncExternalStore(
    (listener) => debugStore.subscribe(listener),
    () => debugStore.isActive(),
    () => import.meta.env.DEV,
  );
}
