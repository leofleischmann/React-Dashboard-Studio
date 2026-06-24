import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hassStore } from './store';
import type { HassEntity } from './types';
import type { KnownEntityId } from './entities.generated';

/**
 * Reactive access to one entity. Re-renders the component ONLY when this
 * specific entity changes.
 *
 *   const temp = useEntity('sensor.wohnzimmer_temperatur');
 *   <div>{temp?.state} °C</div>
 */
export function useEntity(entityId: KnownEntityId): HassEntity | undefined {
  const getSnapshot = useCallback(
    () => hassStore.getEntity(entityId),
    [entityId],
  );
  return useSyncExternalStore(hassStore.subscribe, getSnapshot);
}

/** Reactive shortcut for just the state string, e.g. "on" / "23.4". */
export function useEntityState(entityId: KnownEntityId): string | undefined {
  const getSnapshot = useCallback(
    () => hassStore.getEntity(entityId)?.state,
    [entityId],
  );
  return useSyncExternalStore(hassStore.subscribe, getSnapshot);
}

/**
 * Reactive list of every entity in a domain, e.g. useEntitiesByDomain('sensor').
 * Returns a referentially stable array while nothing in that domain changes.
 */
export function useEntitiesByDomain(domain: string): HassEntity[] {
  const cacheRef = useRef<HassEntity[]>([]);
  const getSnapshot = useCallback(() => {
    const next = hassStore.getEntitiesByDomain(domain) as HassEntity[];
    const prev = cacheRef.current;
    if (prev.length === next.length && prev.every((e, i) => e === next[i])) {
      return prev;
    }
    cacheRef.current = next;
    return next;
  }, [domain]);
  return useSyncExternalStore(hassStore.subscribe, getSnapshot);
}

/** True once Home Assistant has handed us a hass object (connected). */
export function useHassReady(): boolean {
  return useSyncExternalStore(
    hassStore.subscribe,
    () => hassStore.getHass() !== null,
  );
}

/**
 * True on phone-sized layouts. Combines Home Assistant's own `narrow` flag
 * (which also accounts for the docked sidebar) with a width media query, so the
 * editor stays hidden on mobile even when HA hasn't set `narrow` yet.
 */
export function useIsMobile(breakpoint = 860): boolean {
  const haNarrow = useSyncExternalStore(hassStore.subscribe, hassStore.getNarrow);

  const query = `(max-width: ${breakpoint}px)`;
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return haNarrow || matches;
}

/**
 * Non-reactive escape hatch for use INSIDE event handlers / callbacks, where
 * you just need the current value and don't want a subscription:
 *
 *   onClick={() => console.log(states.sensor.wohnzimmer_temperatur?.state)}
 *
 * For values you render, use the hooks above instead (those are reactive).
 */
export const states: Record<
  string,
  Record<string, HassEntity | undefined>
> = new Proxy(
  {},
  {
    get(_target, domain: string) {
      return new Proxy(
        {},
        {
          get(_t, name: string) {
            return hassStore.getEntity(`${domain}.${String(name)}`);
          },
        },
      );
    },
  },
) as Record<string, Record<string, HassEntity | undefined>>;

/**
 * Call a Home Assistant service.
 *
 *   callService('light', 'toggle', { entity_id: 'light.kueche' });
 */
export function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
  target?: Record<string, unknown>,
): Promise<unknown> {
  return hassStore.callService(domain, service, serviceData, target);
}
