import { hassStore } from './store';

export type HistoryPoint = { t: number; v: number };

type HistoryRow = {
  entity_id?: string;
  state: string;
  last_changed?: string;
  last_updated?: string;
};

function parseRestHistory(data: unknown): Record<string, HistoryPoint[]> {
  if (!Array.isArray(data)) return {};
  const out: Record<string, HistoryPoint[]> = {};

  for (const group of data) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const entityId = (group[0] as HistoryRow).entity_id;
    if (!entityId) continue;

    const points: HistoryPoint[] = [];
    for (const row of group as HistoryRow[]) {
      const v = Number.parseFloat(row.state);
      if (!Number.isFinite(v)) continue;
      const ts = row.last_changed ?? row.last_updated;
      if (!ts) continue;
      points.push({ t: new Date(ts).getTime(), v });
    }
    if (points.length > 0) out[entityId] = points;
  }
  return out;
}

/** Load recorder history via HA REST API (panel + dev via callApi). */
export async function fetchEntityHistory(
  entityIds: string[],
  hours = 24,
): Promise<Record<string, HistoryPoint[]>> {
  if (entityIds.length === 0) return {};

  const end = new Date();
  const start = new Date(end.getTime() - hours * 3_600_000);
  const q = new URLSearchParams({
    filter_entity_id: entityIds.join(','),
    end_time: end.toISOString(),
    minimal_response: '1',
  });
  const path = `history/period/${start.toISOString()}?${q.toString()}`;

  const callApi = hassStore.getHass()?.callApi;
  if (typeof callApi !== 'function') return {};

  const data = await callApi('GET', path);
  return parseRestHistory(data);
}

/** Sum positive deltas between history points (energy/consumption sensors). */
export function aggregateHistoryDelta(points: HistoryPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const delta = points[i].v - points[i - 1].v;
    if (delta > 0) total += delta;
  }
  return total;
}

/** Daily consumption sums keyed by YYYY-MM-DD (positive deltas only). */
export function aggregateHistoryByDay(
  points: HistoryPoint[],
): Record<string, number> {
  if (points.length < 2) return {};

  const out: Record<string, number> = {};
  for (let i = 1; i < points.length; i += 1) {
    const delta = points[i].v - points[i - 1].v;
    if (delta <= 0) continue;
    const day = new Date(points[i].t).toISOString().slice(0, 10);
    out[day] = (out[day] ?? 0) + delta;
  }
  return out;
}

/** Total or per-day aggregation helper for energy history. */
export function aggregateHistory(
  points: HistoryPoint[],
  mode: 'total' | 'daily' = 'total',
): number | Record<string, number> {
  return mode === 'daily'
    ? aggregateHistoryByDay(points)
    : aggregateHistoryDelta(points);
}
