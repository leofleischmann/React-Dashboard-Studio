import type { HistoryPoint } from './history';
import { fetchEntityHistory } from './history';
import { createSharedRestCache } from './restCache';
import type { EntityStatistics } from './statistics';
import { fetchEntityStatistics } from './statistics';

const historyCache = createSharedRestCache(fetchEntityHistory, {});
const statisticsCache = createSharedRestCache(fetchEntityStatistics, {});

export function subscribeEntityHistory(
  entityIds: readonly string[],
  hours: number,
  refreshMs: number,
  listener: () => void,
): () => void {
  return historyCache.subscribe(entityIds, hours, refreshMs, listener);
}

export function getEntityHistorySnapshot(
  entityIds: readonly string[],
  hours: number,
): Record<string, HistoryPoint[]> {
  return historyCache.getSnapshot(entityIds, hours);
}

export function isEntityHistoryPending(
  entityIds: readonly string[],
  hours: number,
): boolean {
  return historyCache.isPending(entityIds, hours);
}

export function subscribeEntityStatistics(
  entityIds: readonly string[],
  days: number,
  refreshMs: number,
  listener: () => void,
): () => void {
  return statisticsCache.subscribe(entityIds, days, refreshMs, listener);
}

export function getEntityStatisticsSnapshot(
  entityIds: readonly string[],
  days: number,
): Record<string, EntityStatistics> {
  return statisticsCache.getSnapshot(entityIds, days);
}
