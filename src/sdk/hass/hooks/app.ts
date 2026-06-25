import { useEffect, useState, useSyncExternalStore } from 'react';
import { hassStore } from '../store';
import type { HassEntity } from '../types';
import { useHassReady } from './ready';

export type HassServiceTarget = {
  entity_id?: string | string[];
  area_id?: string | string[];
  device_id?: string | string[];
  label_id?: string | string[];
};

/** Current time, re-renders on an interval (default: every minute). */
export function useTime(tickMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return now;
}

/**
 * True on phone-sized layouts. Combines Home Assistant's own `narrow` flag
 * (which also accounts for the docked sidebar) with a width media query, so the
 * editor stays hidden on mobile even when HA hasn't set `narrow` yet.
 */
export function useIsMobile(breakpoint = 860): boolean {
  const haNarrow = useSyncExternalStore(hassStore.subscribeNarrow, hassStore.getNarrow);

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

/** callService with typed HA target (entity, area, device, label). */
export function callServiceWithTarget(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
  target?: HassServiceTarget,
): Promise<unknown> {
  return hassStore.callService(domain, service, serviceData, target);
}

/** Raw hass object (for advanced custom dashboards using callApi, etc.). */
export function getAppHass() {
  return hassStore.getHass();
}

// Re-export so app consumers can import connection state from the same module.
export { useHassReady };
