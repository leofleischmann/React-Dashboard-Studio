import { createSharedRestCache } from './restCache';
import { EMPTY_LOGBOOK_ENTRIES, fetchLogbookForCache, type LogbookEntry } from './logbook';

const logbookCache = createSharedRestCache(fetchLogbookForCache, {});

export function subscribeLogbook(
  marker: string,
  hours: number,
  limit: number,
  refreshMs: number,
  listener: () => void,
): () => void {
  const param = hours * 1000 + limit;
  return logbookCache.subscribe([marker], param, refreshMs, listener);
}

export function getLogbookSnapshot(
  marker: string,
  hours: number,
  limit: number,
): LogbookEntry[] {
  const param = hours * 1000 + limit;
  return logbookCache.getSnapshot([marker], param)[marker] ?? EMPTY_LOGBOOK_ENTRIES;
}

export function isLogbookPending(
  marker: string,
  hours: number,
  limit: number,
): boolean {
  const param = hours * 1000 + limit;
  return logbookCache.isPending([marker], param);
}
