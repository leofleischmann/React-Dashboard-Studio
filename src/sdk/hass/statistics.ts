import { hassStore } from './store';

export type EntityStatistics = {
  min: number;
  max: number;
  mean: number;
  sum?: number;
  unit?: string;
};

type StatisticRow = {
  start: string;
  end: string;
  mean: number | null;
  min: number | null;
  max: number | null;
  sum: number | null;
  metadata?: { statistic_id?: string; unit_of_measurement?: string };
};

function parseStatistics(
  data: unknown,
  entityIds: string[],
): Record<string, EntityStatistics> {
  if (!Array.isArray(data)) return {};

  const buckets = new Map<string, StatisticRow[]>();
  for (const row of data as StatisticRow[]) {
    const id = row.metadata?.statistic_id;
    if (!id) continue;
    let list = buckets.get(id);
    if (!list) {
      list = [];
      buckets.set(id, list);
    }
    list.push(row);
  }

  const out: Record<string, EntityStatistics> = {};
  for (const entityId of entityIds) {
    const rows = buckets.get(entityId);
    if (!rows || rows.length === 0) continue;

    let min = Infinity;
    let max = -Infinity;
    let meanSum = 0;
    let meanCount = 0;
    let sumTotal = 0;
    let hasSum = false;
    let unit: string | undefined;

    for (const row of rows) {
      if (row.min != null && row.min < min) min = row.min;
      if (row.max != null && row.max > max) max = row.max;
      if (row.mean != null) {
        meanSum += row.mean;
        meanCount += 1;
      }
      if (row.sum != null) {
        sumTotal += row.sum;
        hasSum = true;
      }
      unit ??= row.metadata?.unit_of_measurement;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || meanCount === 0) continue;

    out[entityId] = {
      min,
      max,
      mean: meanSum / meanCount,
      sum: hasSum ? sumTotal : undefined,
      unit,
    };
  }

  return out;
}

/** Load recorder statistics for the last N days via HA REST API. */
export async function fetchEntityStatistics(
  entityIds: string[],
  days = 7,
): Promise<Record<string, EntityStatistics>> {
  if (entityIds.length === 0) return {};

  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const q = new URLSearchParams({
    statistic_ids: entityIds.join(','),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  });
  const path = `history/statistics/during?${q.toString()}`;

  const callApi = hassStore.getHass()?.callApi;
  if (typeof callApi !== 'function') return {};

  const data = await callApi('GET', path);
  return parseStatistics(data, entityIds);
}
