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
import {
  getEntityHistorySnapshot,
  getEntityStatisticsSnapshot,
  isEntityHistoryPending,
  subscribeEntityHistory,
  subscribeEntityStatistics,
} from './cachedRest';
import { normalizeIds } from './restCache';
import { fetchCalendarEvents, type CalendarEvent } from './calendar';
import { filterEntities, subscriptionDomainsForFilter, type EntityFilter } from './entityFilter';
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
  const subscribe = useCallback(
    (listener: () => void) => hassStore.subscribeEntity(entityId, listener),
    [entityId],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Reactive shortcut for just the state string, e.g. "on" / "23.4". */
export function useEntityState(entityId: KnownEntityId): string | undefined {
  const getSnapshot = useCallback(
    () => hassStore.getEntity(entityId)?.state,
    [entityId],
  );
  const subscribe = useCallback(
    (listener: () => void) => hassStore.subscribeEntity(entityId, listener),
    [entityId],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
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
  const subscribe = useCallback(
    (listener: () => void) => hassStore.subscribeEntity(entityId, listener),
    [entityId],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
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
      const domains = subscriptionDomainsForFilter(JSON.parse(filterKey) as EntityFilter);
      const unsubHass = hassStore.subscribeDomains(domains, listener);
      const unsubRegistry = needsRegistry
        ? registryStore.subscribe(listener)
        : () => {};
      return () => {
        unsubHass();
        unsubRegistry();
      };
    },
    [needsRegistry, filterKey],
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
  const cacheRef = useRef<AreaEntry[]>([]);

  useEffect(() => {
    if (ready) registryStore.ensureLoaded();
  }, [ready]);

  const getSnapshot = useCallback(() => {
    const next = registryStore.getAreas();
    const prev = cacheRef.current;
    if (prev.length === next.length && prev.every((a, i) => a === next[i])) {
      return prev;
    }
    cacheRef.current = next;
    return next;
  }, []);

  const subscribe = useCallback(
    (listener: () => void) => registryStore.subscribe(listener),
    [],
  );

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
  const subscribe = useCallback(
    (listener: () => void) => hassStore.subscribeDomain(domain, listener),
    [domain],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** True once Home Assistant has handed us a hass object (connected). */
export function useHassReady(): boolean {
  return useSyncExternalStore(
    hassStore.subscribeHassMeta,
    () => hassStore.getHass() !== null,
  );
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

function entityIdsFromKey(idsKey: string): string[] {
  return idsKey ? idsKey.split('\0') : [];
}

/** Reactive recorder history for chart widgets. Refreshes on an interval. */
export function useEntityHistory(
  entityIds: string[],
  options: { hours?: number; refreshMs?: number } = {},
): Record<string, HistoryPoint[]> {
  const { hours = 24, refreshMs = 180_000 } = options;
  const ready = useHassReady();
  const idsKey = normalizeIds(entityIds);

  const getSnapshot = useCallback(() => {
    if (!ready || !idsKey) return {};
    return getEntityHistorySnapshot(entityIdsFromKey(idsKey), hours);
  }, [ready, idsKey, hours]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !idsKey) return () => {};
      return subscribeEntityHistory(entityIdsFromKey(idsKey), hours, refreshMs, listener);
    },
    [ready, idsKey, hours, refreshMs],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => ({}));
}

/** True until the first history fetch for this entity set completes. */
export function useEntityHistoryPending(
  entityIds: string[],
  options: { hours?: number; refreshMs?: number } = {},
): boolean {
  const { hours = 24, refreshMs = 180_000 } = options;
  const ready = useHassReady();
  const idsKey = normalizeIds(entityIds);

  const getSnapshot = useCallback(() => {
    if (!ready || !idsKey) return false;
    return isEntityHistoryPending(entityIdsFromKey(idsKey), hours);
  }, [ready, idsKey, hours]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !idsKey) return () => {};
      return subscribeEntityHistory(entityIdsFromKey(idsKey), hours, refreshMs, listener);
    },
    [ready, idsKey, hours, refreshMs],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Reactive statistics (min/max/mean) over 7 or 30 days. */
export function useEntityStatistics(
  entityIds: string[],
  options: { days?: 7 | 30; refreshMs?: number } = {},
): Record<string, EntityStatistics> {
  const { days = 7, refreshMs = 300_000 } = options;
  const ready = useHassReady();
  const idsKey = normalizeIds(entityIds);

  const getSnapshot = useCallback(() => {
    if (!ready || !idsKey) return {};
    return getEntityStatisticsSnapshot(entityIdsFromKey(idsKey), days);
  }, [ready, idsKey, days]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !idsKey) return () => {};
      return subscribeEntityStatistics(entityIdsFromKey(idsKey), days, refreshMs, listener);
    },
    [ready, idsKey, days, refreshMs],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => ({}));
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
