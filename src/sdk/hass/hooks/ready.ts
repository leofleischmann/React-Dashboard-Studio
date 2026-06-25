import { useSyncExternalStore } from 'react';
import { hassStore } from '../store';

/** True once Home Assistant has handed us a hass object (connected). */
export function useHassReady(): boolean {
  return useSyncExternalStore(
    hassStore.subscribeHassMeta,
    () => hassStore.getHass() !== null,
  );
}
