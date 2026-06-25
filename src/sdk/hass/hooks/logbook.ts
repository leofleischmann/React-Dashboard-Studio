import { useCallback, useEffect, useRef } from 'react';
import {
  getLogbookSnapshot,
  isLogbookPending,
  subscribeLogbook,
} from '../cachedLogbook';
import {
  logbookCacheMarker,
  EMPTY_LOGBOOK_ENTRIES,
  type LogbookEntry,
} from '../logbook';
import { useHassReady } from './ready';
import { stableArraySnapshot } from './shared';
import { useSharedRestQuery } from './restStore';

const EMPTY_LOGBOOK = EMPTY_LOGBOOK_ENTRIES;

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
  const entriesCacheRef = useRef<LogbookEntry[]>(EMPTY_LOGBOOK);

  const getDataSnapshot = useCallback(() => {
    const next = getLogbookSnapshot(marker, hours, limit);
    return stableArraySnapshot(entriesCacheRef, next);
  }, [marker, hours, limit]);

  const getPendingSnapshot = useCallback(
    () => isLogbookPending(marker, hours, limit),
    [marker, hours, limit],
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeLogbook(marker, hours, limit, refreshMs, listener),
    [marker, hours, limit, refreshMs],
  );

  const { data: entries, loading } = useSharedRestQuery(
    ready,
    subscribe,
    getDataSnapshot,
    getPendingSnapshot,
    EMPTY_LOGBOOK,
  );

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
