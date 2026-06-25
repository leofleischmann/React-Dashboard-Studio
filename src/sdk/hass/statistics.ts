import { hassStore } from './store';

export type EntityStatistics = {
  min: number;
  max: number;
  mean: number;
  sum?: number;
  unit?: string;
};

type StatisticRow = {
  start: number;
  end: number;
  mean?: number | null;
  min?: number | null;
  max?: number | null;
  sum?: number | null;
};

function statisticsPeriod(days: number): 'hour' | 'day' {
  return days <= 7 ? 'hour' : 'day';
}

function parseStatisticsResponse(
  data: unknown,
  entityIds: string[],
): Record<string, EntityStatistics> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  const record = data as Record<string, StatisticRow[]>;
  const out: Record<string, EntityStatistics> = {};

  for (const entityId of entityIds) {
    const rows = record[entityId];
    if (!rows?.length) continue;

    let min = Infinity;
    let max = -Infinity;
    let meanSum = 0;
    let meanCount = 0;
    let sumTotal = 0;
    let hasSum = false;

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
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || meanCount === 0) continue;

    out[entityId] = {
      min,
      max,
      mean: meanSum / meanCount,
      sum: hasSum ? sumTotal : undefined,
    };
  }

  return out;
}

/** Load recorder statistics for the last N days via HA WebSocket API. */
export async function fetchEntityStatistics(
  entityIds: string[],
  days = 7,
): Promise<Record<string, EntityStatistics>> {
  if (entityIds.length === 0) return {};

  const connection = hassStore.getHass()?.connection;
  if (!connection) return {};

  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);

  const data = await connection.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    statistic_ids: entityIds,
    period: statisticsPeriod(days),
    types: ['mean', 'min', 'max', 'sum'],
  });

  return parseStatisticsResponse(data, entityIds);
}
