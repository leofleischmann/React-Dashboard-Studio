import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
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
