import type { HistoryPoint } from './history';
import { aggregateHistoryByDay, aggregateHistoryDelta } from './history';

export type EnergyPeriod = 'today' | 'week' | 'month';

/** Start timestamp (ms) for an energy aggregation period. */
export function energyPeriodStartMs(
  period: EnergyPeriod,
  now = new Date(),
): number {
  switch (period) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
    case 'week':
      return now.getTime() - 7 * 24 * 3_600_000;
    case 'month': {
      const start = new Date(now);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
  }
}

/** Recorder window (hours) to cover a period with buffer. */
export function energyPeriodHours(
  period: EnergyPeriod,
  now = new Date(),
): number {
  switch (period) {
    case 'today': {
      const startMs = energyPeriodStartMs('today', now);
      const elapsed = Math.max(1, (now.getTime() - startMs) / 3_600_000);
      return Math.ceil(elapsed) + 1;
    }
    case 'week':
      return 24 * 7 + 2;
    case 'month': {
      const startMs = energyPeriodStartMs('month', now);
      const elapsed = Math.max(1, (now.getTime() - startMs) / 3_600_000);
      return Math.ceil(elapsed) + 2;
    }
  }
}

export function filterHistorySince(
  points: HistoryPoint[],
  sinceMs: number,
): HistoryPoint[] {
  if (points.length === 0) return points;
  const filtered = points.filter((p) => p.t >= sinceMs);
  if (filtered.length >= 2) return filtered;
  const before = points.filter((p) => p.t < sinceMs);
  const anchor = before[before.length - 1];
  if (anchor && filtered.length === 1) return [anchor, filtered[0]];
  if (anchor && filtered.length === 0) return [anchor];
  return filtered;
}

/** kWh consumed in a period from cumulative energy sensor history. */
export function computeEnergyKwh(
  points: HistoryPoint[] | undefined,
  period: EnergyPeriod,
  now = new Date(),
): number | undefined {
  if (!points?.length) return undefined;
  const sinceMs = energyPeriodStartMs(period, now);
  const slice = filterHistorySince(points, sinceMs);
  if (slice.length < 2) return 0;
  return aggregateHistoryDelta(slice);
}

/** Daily kWh totals for charting (YYYY-MM-DD -> kWh). */
export function energyDailySeries(
  points: HistoryPoint[] | undefined,
  period: EnergyPeriod,
  now = new Date(),
): HistoryPoint[] {
  if (!points?.length) return [];
  const sinceMs = energyPeriodStartMs(period, now);
  const slice = filterHistorySince(points, sinceMs);
  const byDay = aggregateHistoryByDay(slice);
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ t: new Date(`${day}T12:00:00`).getTime(), v }));
}

export function energyPeriodLabel(period: EnergyPeriod): string {
  switch (period) {
    case 'today':
      return 'Heute';
    case 'week':
      return '7 Tage';
    case 'month':
      return 'Monat';
  }
}
