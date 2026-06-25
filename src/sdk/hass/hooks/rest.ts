import { useCallback, useEffect, useState } from 'react';
import type { HistoryPoint } from '../history';
import type { EntityStatistics } from '../statistics';
import {
  getEntityHistorySnapshot,
  getEntityStatisticsSnapshot,
  isEntityHistoryPending,
  subscribeEntityHistory,
  subscribeEntityStatistics,
} from '../cachedRest';
import { normalizeIds } from '../restCache';
import { fetchCalendarEvents, type CalendarEvent } from '../calendar';
import { useHassReady } from './ready';
import { entityIdsFromKey } from './shared';
import { EMPTY_REST_RECORD, useSharedRestSubscribe } from './restStore';

/** Reactive recorder history for chart widgets. Refreshes on an interval. */
export function useEntityHistory(
  entityIds: string[],
  options: { hours?: number; refreshMs?: number } = {},
): Record<string, HistoryPoint[]> {
  const { hours = 24, refreshMs = 180_000 } = options;
  const ready = useHassReady();
  const idsKey = normalizeIds(entityIds);
  const active = ready && Boolean(idsKey);

  const getSnapshot = useCallback(
    () => getEntityHistorySnapshot(entityIdsFromKey(idsKey), hours),
    [idsKey, hours],
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeEntityHistory(entityIdsFromKey(idsKey), hours, refreshMs, listener),
    [idsKey, hours, refreshMs],
  );

  return useSharedRestSubscribe(
    active,
    subscribe,
    getSnapshot,
    EMPTY_REST_RECORD,
  );
}

/** True until the first history fetch for this entity set completes. */
export function useEntityHistoryPending(
  entityIds: string[],
  options: { hours?: number; refreshMs?: number } = {},
): boolean {
  const { hours = 24, refreshMs = 180_000 } = options;
  const ready = useHassReady();
  const idsKey = normalizeIds(entityIds);
  const active = ready && Boolean(idsKey);

  const getSnapshot = useCallback(
    () => isEntityHistoryPending(entityIdsFromKey(idsKey), hours),
    [idsKey, hours],
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeEntityHistory(entityIdsFromKey(idsKey), hours, refreshMs, listener),
    [idsKey, hours, refreshMs],
  );

  return useSharedRestSubscribe(active, subscribe, getSnapshot, false);
}

/** Reactive statistics (min/max/mean) over 7 or 30 days. */
export function useEntityStatistics(
  entityIds: string[],
  options: { days?: 7 | 30; refreshMs?: number } = {},
): Record<string, EntityStatistics> {
  const { days = 7, refreshMs = 300_000 } = options;
  const ready = useHassReady();
  const idsKey = normalizeIds(entityIds);
  const active = ready && Boolean(idsKey);

  const getSnapshot = useCallback(
    () => getEntityStatisticsSnapshot(entityIdsFromKey(idsKey), days),
    [idsKey, days],
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeEntityStatistics(entityIdsFromKey(idsKey), days, refreshMs, listener),
    [idsKey, days, refreshMs],
  );

  return useSharedRestSubscribe(
    active,
    subscribe,
    getSnapshot,
    EMPTY_REST_RECORD,
  );
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
