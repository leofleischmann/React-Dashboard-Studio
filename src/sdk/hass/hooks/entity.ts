import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { hassStore } from '../store';
import type { HassEntity } from '../types';
import type { KnownEntityId } from '../entityId';
import { filterEntities, subscriptionDomainsForFilter, type EntityFilter } from '../entityFilter';
import {
  registryStore,
  type EntityRegistryEntry,
  type AreaEntry,
  type LabelEntry,
} from '../registryStore';
import { useHassReady } from './ready';
import { stableArraySnapshot } from './shared';
import { useTime } from './app';

const MISSING_STATES = new Set(['unavailable', 'unknown']);

export type EntityHookOptions = {
  /** Used when the entity is missing or state is unavailable/unknown. */
  fallback?: string;
};

function entityWithFallback(
  entity: HassEntity | undefined,
  entityId: KnownEntityId,
  fallback?: string,
): HassEntity | undefined {
  if (!fallback) return entity;
  if (entity && !MISSING_STATES.has(entity.state)) return entity;
  const now = new Date().toISOString();
  return {
    entity_id: entityId,
    state:
      entity && !MISSING_STATES.has(entity.state)
        ? entity.state
        : fallback,
    attributes: entity?.attributes ?? {},
    last_changed: entity?.last_changed ?? now,
    last_updated: entity?.last_updated ?? now,
    context: entity?.context ?? { id: '', parent_id: null, user_id: null },
  };
}

function stateWithFallback(
  state: string | undefined,
  fallback?: string,
): string | undefined {
  if (state === undefined || MISSING_STATES.has(state)) return fallback ?? state;
  return state;
}

/**
 * Reactive access to one entity. Re-renders the component ONLY when this
 * specific entity changes.
 *
 *   const temp = useEntity('sensor.wohnzimmer_temperatur');
 *   <div>{temp?.state} °C</div>
 *
 * With `fallback`, missing/unavailable entities return a stub with that state:
 *
 *   const temp = useEntity('sensor.wohnzimmer_temperatur', { fallback: '–' });
 *   <div>{temp.state}</div>
 */
export function useEntity(
  entityId: KnownEntityId,
  options?: EntityHookOptions,
): HassEntity | undefined {
  const getSnapshot = useCallback(
    () => entityWithFallback(hassStore.getEntity(entityId), entityId, options?.fallback),
    [entityId, options?.fallback],
  );
  const subscribe = useCallback(
    (listener: () => void) => hassStore.subscribeEntity(entityId, listener),
    [entityId],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Reactive shortcut for just the state string, e.g. "on" / "23.4". */
export function useEntityState(
  entityId: KnownEntityId,
  options?: EntityHookOptions,
): string | undefined {
  const getSnapshot = useCallback(
    () =>
      stateWithFallback(hassStore.getEntity(entityId)?.state, options?.fallback),
    [entityId, options?.fallback],
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
    return stableArraySnapshot(cacheRef, next);
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
    return stableArraySnapshot(cacheRef, next);
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

  useEffect(() => {
    if (ready) registryStore.ensureLoaded();
  }, [ready]);

  const cacheRef = useRef<LabelEntry[]>([]);

  const getSnapshot = useCallback(() => {
    const next = registryStore.getLabels();
    return stableArraySnapshot(cacheRef, next);
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

/**
 * Reactive list of every entity in a domain, e.g. useEntitiesByDomain('sensor').
 * Returns a referentially stable array while nothing in that domain changes.
 */
export function useEntitiesByDomain(domain: string): HassEntity[] {
  const cacheRef = useRef<HassEntity[]>([]);
  const getSnapshot = useCallback(() => {
    const next = hassStore.getEntitiesByDomain(domain) as HassEntity[];
    return stableArraySnapshot(cacheRef, next);
  }, [domain]);
  const subscribe = useCallback(
    (listener: () => void) => hassStore.subscribeDomain(domain, listener),
    [domain],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
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
