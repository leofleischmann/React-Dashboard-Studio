import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
import {
  getLogbookSnapshot,
  isLogbookPending,
  subscribeLogbook,
} from './cachedLogbook';
import {
  fetchLogbook,
  logbookCacheMarker,
  type LogbookEntry,
} from './logbook';
import {
  getWeatherForecastSnapshot,
  isWeatherForecastPending,
  subscribeWeatherForecast,
} from './cachedWeather';
import {
  FORECAST_TYPE_PARAM,
  fetchWeatherForecast,
  type WeatherForecastEntry,
  type WeatherForecastType,
} from './weather';
import { filterEntities, subscriptionDomainsForFilter, type EntityFilter } from './entityFilter';
import {
  registryStore,
  type EntityRegistryEntry,
  type AreaEntry,
  type LabelEntry,
} from './registryStore';
import { useTheme, useDarkMode, applyThemeVars } from './theme';
import { entityAgeLabel, entityAgeMs } from '../format';
import type { EnergyPeriod } from './energy';
import {
  computeEnergyKwh,
  energyDailySeries,
  energyPeriodHours,
} from './energy';
import {
  getTemplateSnapshot,
  subscribeTemplate,
} from './cachedTemplates';
import type {
  TemplateListeners,
  TemplateSnapshot,
} from './templateTypes';
import {
  IDLE_TEMPLATE_SNAPSHOT,
  templateSnapshotsEqual,
} from './templateTypes';

export type { HassEntity } from './types';
export type { EntityFilter } from './entityFilter';
export type { EntityStatistics } from './statistics';
export type { CalendarEvent } from './calendar';
export type { LogbookEntry } from './logbook';
export { fetchLogbook, logbookCacheMarker };
export type { WeatherForecastEntry, WeatherForecastType } from './weather';
export { fetchWeatherForecast, FORECAST_TYPE_PARAM };
export type { EntityRegistryEntry, AreaEntry, LabelEntry } from './registryStore';
export { aggregateHistory, aggregateHistoryByDay, aggregateHistoryDelta };
export { fetchEntityHistory, fetchEntityStatistics, fetchCalendarEvents };
export type { HistoryPoint } from './history';
export { useTheme, useDarkMode, applyThemeVars };
export type { TemplateListeners } from './templateTypes';
export {
  DashboardProvider,
  useDashboardState,
  usePersistentState,
  clearPersistentState,
  useDashboardScope,
} from '../dashboard';

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

/** All labels from the HA label registry. */
export function useLabels(): LabelEntry[] {
  const ready = useHassReady();
  const cacheRef = useRef<LabelEntry[]>([]);

  useEffect(() => {
    if (ready) registryStore.ensureLoaded();
  }, [ready]);

  const getSnapshot = useCallback(() => {
    const next = registryStore.getLabels();
    const prev = cacheRef.current;
    if (prev.length === next.length && prev.every((l, i) => l === next[i])) {
      return prev;
    }
    cacheRef.current = next;
    return next;
  }, []);

  return useSyncExternalStore(registryStore.subscribe, getSnapshot, () => []);
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

/** Sun position and schedule from a `sun.*` entity (default `sun.sun`). */
export function useSun(entityId: KnownEntityId | string = 'sun.sun') {
  const sun = useEntity(entityId as KnownEntityId);
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

const EMPTY_LOGBOOK: LogbookEntry[] = [];

export interface UseLogbookOptions {
  /** Single entity filter. */
  entityId?: string;
  /** Domain filter, e.g. `binary_sensor`. */
  domain?: string;
  /** Lookback window in hours (default 24). */
  hours?: number;
  /** Max entries returned (default 20). */
  limit?: number;
  refreshMs?: number;
}

export interface UseLogbookResult {
  entries: LogbookEntry[];
  loading: boolean;
}

/**
 * Recent logbook entries from HA recorder (`/api/logbook/...`).
 *
 *   const { entries } = useLogbook({ entityId: 'binary_sensor.tuer', limit: 10 });
 *   const motion = useLogbook({ domain: 'binary_sensor', hours: 12 });
 */
export function useLogbook(options: UseLogbookOptions = {}): UseLogbookResult {
  const {
    entityId,
    domain,
    hours = 24,
    limit = 20,
    refreshMs = 120_000,
  } = options;
  const ready = useHassReady();

  const marker = logbookCacheMarker({ entityId, domain, hours, limit });
  const queryKey = `${marker}\0${hours}\0${limit}`;

  const getSnapshot = useCallback(() => {
    if (!ready) return EMPTY_LOGBOOK;
    return getLogbookSnapshot(marker, hours, limit);
  }, [ready, marker, hours, limit]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready) return () => {};
      return subscribeLogbook(marker, hours, limit, refreshMs, listener);
    },
    [ready, marker, hours, limit, refreshMs],
  );

  const getPendingSnapshot = useCallback(() => {
    if (!ready) return false;
    return isLogbookPending(marker, hours, limit);
  }, [ready, marker, hours, limit]);

  const loading = useSyncExternalStore(subscribe, getPendingSnapshot, () => false);
  const entries = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_LOGBOOK);

  useEffect(() => {
    if (loading) return;
    console.log(
      '[Debug useLogbook]:',
      queryKey,
      entries.length,
      'entries',
    );
  }, [queryKey, entries.length, loading]);

  return { entries, loading };
}

const EMPTY_WEATHER_FORECAST: WeatherForecastEntry[] = [];

export interface UseWeatherForecastOptions {
  /** Forecast resolution (default `daily`). */
  type?: WeatherForecastType;
  /** Max entries to return (default 5). */
  days?: number;
  refreshMs?: number;
}

export interface UseWeatherForecastResult {
  forecast: WeatherForecastEntry[];
  loading: boolean;
  type: WeatherForecastType;
}

/**
 * Weather forecast from `weather.get_forecasts` (WebSocket).
 *
 *   const { forecast, loading } = useWeatherForecast('weather.home', { days: 5 });
 */
export function useWeatherForecast(
  entityId: string,
  options: UseWeatherForecastOptions = {},
): UseWeatherForecastResult {
  const { type = 'daily', days = 5, refreshMs = 900_000 } = options;
  const typeParam = FORECAST_TYPE_PARAM[type];
  const ready = useHassReady();
  const idsKey = normalizeIds(entityId ? [entityId] : []);

  const getSnapshot = useCallback(() => {
    if (!ready || !entityId) return EMPTY_WEATHER_FORECAST;
    return (
      getWeatherForecastSnapshot(entityIdsFromKey(idsKey), typeParam)[entityId] ??
      EMPTY_WEATHER_FORECAST
    );
  }, [ready, entityId, idsKey, typeParam]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !entityId) return () => {};
      return subscribeWeatherForecast(
        entityIdsFromKey(idsKey),
        typeParam,
        refreshMs,
        listener,
      );
    },
    [ready, entityId, idsKey, typeParam, refreshMs],
  );

  const getPendingSnapshot = useCallback(() => {
    if (!ready || !entityId) return false;
    return isWeatherForecastPending(entityIdsFromKey(idsKey), typeParam);
  }, [ready, entityId, idsKey, typeParam]);

  const pending = useSyncExternalStore(subscribe, getPendingSnapshot, () => false);

  const all = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_WEATHER_FORECAST,
  );

  const forecast = useMemo(() => all.slice(0, days), [all, days]);

  useEffect(() => {
    if (pending || !entityId) return;
    console.log(
      '[Debug useWeatherForecast]:',
      entityId,
      type,
      forecast.length,
      'entries shown',
    );
  }, [entityId, type, forecast.length, pending]);

  return { forecast, loading: pending, type };
}

export interface UseTemplateOptions {
  /** Optional hint: HA invalidates only these entities. */
  entity_ids?: string[];
  /** Jinja variables, e.g. `{ name: 'Leo' }`. */
  variables?: Record<string, unknown>;
  /** Parse HA result (default: `string`). */
  parse?: 'string' | 'boolean' | 'number';
  strict?: boolean;
  report_errors?: boolean;
  timeout?: number;
}

export interface UseTemplateResult<T = string> {
  value: T | undefined;
  loading: boolean;
  error: string | undefined;
  /** Raw string from HA (always present when ready). */
  raw: string | undefined;
  listeners?: TemplateListeners;
}

const EMPTY_TEMPLATE_RESULT: UseTemplateResult = {
  value: undefined,
  loading: false,
  error: undefined,
  raw: undefined,
};

const LOADING_TEMPLATE_RESULT: UseTemplateResult = {
  value: undefined,
  loading: true,
  error: undefined,
  raw: undefined,
};

function stableEntityIdsKey(entityIds?: string[]): string {
  if (!entityIds?.length) return '';
  return [...entityIds].sort().join(',');
}

function stableVariablesKey(variables?: Record<string, unknown>): string {
  if (!variables) return '';
  return JSON.stringify(variables, Object.keys(variables).sort());
}

function parseTemplateValue(
  raw: string,
  parse: 'string' | 'boolean' | 'number',
): { value: string | boolean | number | undefined; error?: string } {
  if (parse === 'string') return { value: raw };

  if (parse === 'boolean') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return { value: true };
    if (normalized === 'false' || normalized === '0') return { value: false };
    return {
      value: undefined,
      error: `Template-Boolean ungültig: "${raw}"`,
    };
  }

  const n = Number.parseFloat(raw.trim());
  if (Number.isNaN(n)) {
    return {
      value: undefined,
      error: `Template-Zahl ungültig: "${raw}"`,
    };
  }
  return { value: n };
}

function mapTemplateSnapshot<T>(
  snapshot: TemplateSnapshot,
  parse: 'string' | 'boolean' | 'number',
): UseTemplateResult<T> {
  if (snapshot.status === 'idle') return EMPTY_TEMPLATE_RESULT as UseTemplateResult<T>;
  if (snapshot.status === 'loading') {
    return LOADING_TEMPLATE_RESULT as UseTemplateResult<T>;
  }
  if (snapshot.status === 'error') {
    return {
      value: undefined,
      loading: false,
      error: snapshot.error.message,
      raw: undefined,
    } as UseTemplateResult<T>;
  }

  const raw = snapshot.result.value;
  const parsed = parseTemplateValue(raw, parse);
  if (parsed.error) {
    return {
      value: undefined,
      loading: false,
      error: parsed.error,
      raw,
      listeners: snapshot.result.listeners,
    } as UseTemplateResult<T>;
  }

  return {
    value: parsed.value as T,
    loading: false,
    error: undefined,
    raw,
    listeners: snapshot.result.listeners,
  } as UseTemplateResult<T>;
}

/**
 * Evaluate a Home Assistant Jinja2 template live via WebSocket.
 * Uses HA's server-side engine — conditions, calculations, formatting.
 *
 *   const { value } = useTemplate("{{ states('sensor.temp') | float | round(1) }}");
 *   const warm = useTemplate("{{ states('sensor.temp') | float > 20 }}", { parse: 'boolean' });
 */
export function useTemplate<T = string>(
  template: string,
  options: UseTemplateOptions = {},
): UseTemplateResult<T> {
  const {
    entity_ids,
    variables,
    parse = 'string',
    strict,
    report_errors,
    timeout,
  } = options;

  const ready = useHassReady();
  const trimmed = template.trim();
  const entityIdsKey = stableEntityIdsKey(entity_ids);
  const variablesKey = stableVariablesKey(variables);

  const subscriptionOptions = useMemo(
    () => ({
      template: trimmed,
      entity_ids,
      variables,
      strict,
      report_errors,
      timeout,
    }),
    [trimmed, entityIdsKey, variablesKey, strict, report_errors, timeout],
  );

  const snapshotCacheRef = useRef<TemplateSnapshot>(IDLE_TEMPLATE_SNAPSHOT);

  const getSnapshot = useCallback(() => {
    if (!ready || !trimmed) return IDLE_TEMPLATE_SNAPSHOT;
    const next = getTemplateSnapshot(subscriptionOptions);
    const prev = snapshotCacheRef.current;
    if (templateSnapshotsEqual(prev, next)) return prev;
    snapshotCacheRef.current = next;
    return next;
  }, [ready, trimmed, subscriptionOptions]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !trimmed) return () => {};
      return subscribeTemplate(subscriptionOptions, listener);
    },
    [ready, trimmed, subscriptionOptions],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => IDLE_TEMPLATE_SNAPSHOT,
  );

  const result = useMemo(
    () => mapTemplateSnapshot<T>(snapshot, parse),
    [snapshot, parse],
  );

  if (!ready && trimmed) {
    return LOADING_TEMPLATE_RESULT as UseTemplateResult<T>;
  }

  return result;
}

export type { EnergyPeriod } from './energy';
export {
  computeEnergyKwh,
  energyDailySeries,
  energyPeriodHours,
  energyPeriodLabel,
  energyPeriodStartMs,
} from './energy';

export interface UseEnergyOptions {
  period?: EnergyPeriod;
  refreshMs?: number;
}

export interface UseEnergyResult {
  /** Consumption in kWh for the selected period. */
  kwh: number | undefined;
  loading: boolean;
  period: EnergyPeriod;
  /** Raw history points used for the calculation. */
  points: HistoryPoint[];
  /** Daily kWh totals (for charts). */
  daily: HistoryPoint[];
}

/**
 * Energy consumption from a cumulative kWh sensor (recorder history).
 *
 *   const today = useEnergy('sensor.strom_energy', { period: 'today' });
 *   <Stat label="Heute" value={energy(today.kwh)} />
 */
const EMPTY_HISTORY_POINTS: HistoryPoint[] = [];

export function useEnergy(
  entityId: KnownEntityId,
  options: UseEnergyOptions = {},
): UseEnergyResult {
  const { period = 'today', refreshMs = 300_000 } = options;
  const now = useTime(60_000);
  const hours = useMemo(
    () => energyPeriodHours(period, now),
    [period, now],
  );

  const entityIds = entityId ? [entityId] : [];
  const history = useEntityHistory(entityIds, { hours, refreshMs });
  const pending = useEntityHistoryPending(entityIds, { hours, refreshMs });
  const points = entityId ? (history[entityId] ?? EMPTY_HISTORY_POINTS) : EMPTY_HISTORY_POINTS;

  const kwh = useMemo(
    () => computeEnergyKwh(points, period, now),
    [points, period, now],
  );

  const daily = useMemo(
    () => energyDailySeries(points, period, now),
    [points, period, now],
  );

  useEffect(() => {
    if (pending || kwh === undefined) return;
    console.log(
      '[Debug useEnergy]:',
      entityId,
      period,
      `${kwh.toFixed(3)} kWh`,
      `(${points.length} points)`,
    );
  }, [entityId, period, kwh, pending, points.length]);

  return {
    kwh,
    loading: pending,
    period,
    points,
    daily,
  };
}

export interface UseEntityAgeOptions {
  /** Re-render interval for the relative label (default 30s). */
  tickMs?: number;
  /** `relative` -> "vor 23 Min." · `since` -> "seit 23 Min." (default). */
  style?: 'relative' | 'since';
}

export interface UseEntityAgeResult {
  /** German age label derived from `last_changed`. */
  label: string;
  /** When the current state started. */
  changedAt: Date | undefined;
  /** Age in milliseconds. */
  ms: number | undefined;
  /** Current entity state. */
  state: string | undefined;
  entity: HassEntity | undefined;
}

/**
 * How long an entity has been in its current state.
 * Re-renders on entity changes and on a tick interval for live labels.
 *
 *   const door = useEntityAge('binary_sensor.tuer');
 *   <span>Tür offen {door.label}</span>
 */
export function useEntityAge(
  entityId: KnownEntityId,
  options: UseEntityAgeOptions = {},
): UseEntityAgeResult {
  const { tickMs = 30_000, style = 'since' } = options;
  const entity = useEntity(entityId);
  const now = useTime(tickMs);
  const prevStateRef = useRef<string | undefined>();

  useEffect(() => {
    const state = entity?.state;
    if (state === prevStateRef.current) return;
    console.log(
      '[Debug useEntityAge]: state changed',
      entityId,
      state ?? '–',
      entity?.last_changed ?? '–',
    );
    prevStateRef.current = state;
  }, [entityId, entity?.state, entity?.last_changed]);

  return useMemo(() => {
    const nowMs = now.getTime();
    const changedAtRaw = entity?.last_changed
      ? new Date(entity.last_changed)
      : undefined;
    const changedAt =
      changedAtRaw && Number.isFinite(changedAtRaw.getTime())
        ? changedAtRaw
        : undefined;
    const ms = entityAgeMs(entity, nowMs);

    return {
      entity,
      state: entity?.state,
      changedAt,
      ms,
      label: entityAgeLabel(entity, { style, nowMs }),
    };
  }, [entity, now, style]);
}
