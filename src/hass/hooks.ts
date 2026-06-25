import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hassStore } from './store';
import type { HassEntity } from './types';
import type { KnownEntityId } from './entityId';
import {
  fetchEntityHistory,
  type HistoryPoint,
  aggregateHistory,
  aggregateHistoryByDay,
  aggregateHistoryDelta,
} from './history';
import { fetchEntityStatistics, type EntityStatistics } from './statistics';
import { fetchCalendarEvents, type CalendarEvent } from './calendar';
import { filterEntities, type EntityFilter } from './entityFilter';
import {
  registryStore,
  type EntityRegistryEntry,
  type AreaEntry,
} from './registryStore';
import { useTheme, useDarkMode, applyThemeVars } from './theme';

export type { EntityFilter } from './entityFilter';
export type { EntityStatistics } from './statistics';
export type { CalendarEvent } from './calendar';
export type { EntityRegistryEntry, AreaEntry } from './registryStore';
export { aggregateHistory, aggregateHistoryByDay, aggregateHistoryDelta };
export { fetchEntityHistory, fetchEntityStatistics, fetchCalendarEvents };
export type { HistoryPoint } from './history';
export { useTheme, useDarkMode, applyThemeVars };

export type HassServiceTarget = {
  entity_id?: string | string[];
  area_id?: string | string[];
  device_id?: string | string[];
  label_id?: string | string[];
};

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

/** Reactive access to a single entity attribute. */
export function useEntityAttribute<T = unknown>(
  entityId: KnownEntityId,
  attribute: string,
): T | undefined {
  const getSnapshot = useCallback(
    () => hassStore.getEntity(entityId)?.attributes[attribute] as T | undefined,
    [entityId, attribute],
  );
  return useSyncExternalStore(hassStore.subscribe, getSnapshot);
}

/**
 * Filtered entity list — domain, name pattern, device_class, area, state.
 * Area filter loads the HA entity registry once over WebSocket.
 */
export function useEntities(filter: EntityFilter = {}): HassEntity[] {
  const needsRegistry = Boolean(filter.areaId || filter.labelId);
  const filterKey = JSON.stringify(filter);
  const cacheRef = useRef<HassEntity[]>([]);
  const ready = useHassReady();

  useEffect(() => {
    if (needsRegistry && ready) registryStore.ensureLoaded();
  }, [needsRegistry, ready]);

  const getSnapshot = useCallback(() => {
    const parsed = JSON.parse(filterKey) as EntityFilter;
    const next = filterEntities(hassStore.getAllEntities(), parsed);
    const prev = cacheRef.current;
    if (prev.length === next.length && prev.every((e, i) => e === next[i])) {
      return prev;
    }
    cacheRef.current = next;
    return next;
  }, [filterKey]);

  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubHass = hassStore.subscribe(listener);
      const unsubRegistry = needsRegistry
        ? registryStore.subscribe(listener)
        : () => {};
      return () => {
        unsubHass();
        unsubRegistry();
      };
    },
    [needsRegistry],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Entities assigned to a Home Assistant area (via entity registry). */
export function useAreaEntities(areaId: string): HassEntity[] {
  return useEntities({ areaId });
}

/** Entities with a Home Assistant label. */
export function useEntitiesByLabel(labelId: string): HassEntity[] {
  return useEntities({ labelId });
}

/** All areas from the HA area registry. */
export function useAreas(): AreaEntry[] {
  const ready = useHassReady();

  useEffect(() => {
    if (ready) registryStore.ensureLoaded();
  }, [ready]);

  const getSnapshot = useCallback(() => registryStore.getAreas(), []);

  const subscribe = useCallback((listener: () => void) => {
    const unsub = registryStore.subscribe(listener);
    return unsub;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}

/** Name of a HA area by id. */
export function useAreaName(areaId: string): string | undefined {
  const ready = useHassReady();

  useEffect(() => {
    if (ready && areaId) registryStore.ensureLoaded();
  }, [ready, areaId]);

  const getSnapshot = useCallback(
    () => registryStore.getAreaName(areaId),
    [areaId],
  );

  return useSyncExternalStore(registryStore.subscribe, getSnapshot);
}

/** Entity registry metadata for one entity. */
export function useEntityRegistry(
  entityId: KnownEntityId,
): EntityRegistryEntry | undefined {
  const ready = useHassReady();

  useEffect(() => {
    if (ready) registryStore.ensureLoaded();
  }, [ready]);

  const getSnapshot = useCallback(
    () => registryStore.getEntityEntry(entityId),
    [entityId],
  );

  return useSyncExternalStore(registryStore.subscribe, getSnapshot);
}

/** Current time, re-renders on an interval (default: every minute). */
export function useTime(tickMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return now;
}

/** Sun position and schedule from `sun.sun`. */
export function useSun() {
  const sun = useEntity('sun.sun' as KnownEntityId);
  const now = useTime(60_000);
  const attrs = sun?.attributes ?? {};

  const parseDate = (value: unknown): Date | undefined => {
    if (typeof value !== 'string') return undefined;
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : undefined;
  };

  return {
    entity: sun,
    state: sun?.state,
    isDay: sun?.state === 'above_horizon',
    isNight: sun?.state === 'below_horizon',
    elevation: attrs.elevation as number | undefined,
    azimuth: attrs.azimuth as number | undefined,
    rising: parseDate(attrs.next_rising),
    setting: parseDate(attrs.next_setting),
    now,
  };
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

/** Reactive recorder history for chart widgets. Refreshes on an interval. */
export function useEntityHistory(
  entityIds: string[],
  options: { hours?: number; refreshMs?: number } = {},
): Record<string, HistoryPoint[]> {
  const { hours = 24, refreshMs = 180_000 } = options;
  const ready = useHassReady();
  const idsKey = entityIds.join('\0');
  const [data, setData] = useState<Record<string, HistoryPoint[]>>({});

  useEffect(() => {
    if (!ready || entityIds.length === 0) return;

    let cancelled = false;
    const load = () => {
      fetchEntityHistory(entityIds, hours)
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {
          /* recorder unavailable */
        });
    };

    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, idsKey, hours, refreshMs]);

  return data;
}

/** Reactive statistics (min/max/mean) over 7 or 30 days. */
export function useEntityStatistics(
  entityIds: string[],
  options: { days?: 7 | 30; refreshMs?: number } = {},
): Record<string, EntityStatistics> {
  const { days = 7, refreshMs = 300_000 } = options;
  const ready = useHassReady();
  const idsKey = entityIds.join('\0');
  const [data, setData] = useState<Record<string, EntityStatistics>>({});

  useEffect(() => {
    if (!ready || entityIds.length === 0) return;

    let cancelled = false;
    const load = () => {
      fetchEntityStatistics(entityIds, days)
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {
          /* statistics unavailable */
        });
    };

    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, idsKey, days, refreshMs]);

  return data;
}

/** Upcoming events for a calendar entity. */
export function useCalendarEvents(
  entityId: string,
  daysAhead = 7,
  refreshMs = 300_000,
): CalendarEvent[] {
  const ready = useHassReady();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!ready || !entityId) return;

    let cancelled = false;
    const load = () => {
      fetchCalendarEvents(entityId, daysAhead)
        .then((next) => {
          if (!cancelled) setEvents(next);
        })
        .catch(() => {
          /* calendar unavailable */
        });
    };

    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, entityId, daysAhead, refreshMs]);

  return events;
}
