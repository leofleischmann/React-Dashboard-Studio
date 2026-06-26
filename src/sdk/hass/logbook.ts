import { hassStore } from './store';

export interface LogbookEntry {
  when: Date;
  name: string;
  message: string;
  entityId?: string;
  domain?: string;
  state?: string;
  icon?: string;
}

export interface LogbookQuery {
  entityId?: string;
  domain?: string;
  hours?: number;
  limit?: number;
}

type LogbookRow = {
  when?: string;
  name?: string;
  message?: string;
  entity_id?: string;
  domain?: string;
  state?: string;
  icon?: string;
};

function parseLogbookRows(data: unknown): LogbookEntry[] {
  if (!Array.isArray(data)) return [];
  const out: LogbookEntry[] = [];

  for (const row of data as LogbookRow[]) {
    if (!row?.when) continue;
    const when = new Date(row.when);
    if (!Number.isFinite(when.getTime())) continue;
    out.push({
      when,
      name: row.name ?? row.entity_id ?? 'Logbook',
      message: row.message ?? '',
      entityId: row.entity_id,
      domain: row.domain,
      state: row.state,
      icon: row.icon,
    });
  }

  return out;
}

/** Fetch logbook entries via HA REST API (`/api/logbook/...`). */
export async function fetchLogbook(query: LogbookQuery = {}): Promise<LogbookEntry[]> {
  const hours = query.hours ?? 24;
  const limit = query.limit ?? 20;

  const callApi = hassStore.getHass()?.callApi;
  if (typeof callApi !== 'function') {
    return [];
  }

  const end = new Date();
  const start = new Date(end.getTime() - hours * 3_600_000);
  const params = new URLSearchParams({ end_time: end.toISOString() });
  if (query.entityId) params.set('entity', query.entityId);

  const path = `logbook/${encodeURIComponent(start.toISOString())}?${params.toString()}`;

  const data = await callApi('GET', path);
  let entries = parseLogbookRows(data);

  if (query.domain) {
    const prefix = `${query.domain}.`;
    entries = entries.filter((e) => e.entityId?.startsWith(prefix));
  }

  entries.sort((a, b) => b.when.getTime() - a.when.getTime());
  return entries.slice(0, limit);
}

export function logbookCacheMarker(query: LogbookQuery): string {
  if (query.entityId) return query.entityId;
  if (query.domain) return `domain:${query.domain}`;
  return '__all__';
}

export function packLogbookParam(hours: number, limit: number): number {
  return hours * 1000 + limit;
}

export function unpackLogbookParam(param: number): { hours: number; limit: number } {
  return { hours: Math.floor(param / 1000), limit: param % 1000 };
}

export async function fetchLogbookForCache(
  entityIds: string[],
  param: number,
): Promise<Record<string, LogbookEntry[]>> {
  if (entityIds.length === 0) return {};
  const marker = entityIds[0];
  const { hours, limit } = unpackLogbookParam(param);

  const query: LogbookQuery = { hours, limit };
  if (marker.startsWith('domain:')) query.domain = marker.slice('domain:'.length);
  else if (marker !== '__all__') query.entityId = marker;

  const entries = await fetchLogbook(query);
  return { [marker]: entries };
}

/** Stable empty list for useSyncExternalStore snapshots. */
export const EMPTY_LOGBOOK_ENTRIES: LogbookEntry[] = [];
