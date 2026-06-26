import { useEffect, useMemo } from 'react';
import type { KnownEntityId } from '../entityId';
import type { HistoryPoint } from '../history';
import type { EnergyPeriod } from '../energy';
import {
  computeEnergyKwh,
  energyDailySeries,
  energyPeriodHours,
} from '../energy';
import { useTime } from './app';
import { useEntityHistory, useEntityHistoryPending } from './rest';

export interface UseEnergyOptions {
  period?: EnergyPeriod;
  refreshMs?: number;
}

export interface UseEnergyResult {
  /** Consumption in kWh for the selected period. */
  kwh: number | undefined;
  loading: boolean;
  period: EnergyPeriod;
  /** Raw history points used for the calculation. */
  points: HistoryPoint[];
  /** Daily kWh totals (for charts). */
  daily: HistoryPoint[];
}

/**
 * Energy consumption from a cumulative kWh sensor (recorder history).
 *
 *   const today = useEnergy('sensor.strom_energy', { period: 'today' });
 *   <Stat label="Heute" value={energy(today.kwh)} />
 */
const EMPTY_HISTORY_POINTS: HistoryPoint[] = [];

export function useEnergy(
  entityId: KnownEntityId,
  options: UseEnergyOptions = {},
): UseEnergyResult {
  const { period = 'today', refreshMs = 300_000 } = options;
  const now = useTime(60_000);
  const hours = useMemo(
    () => energyPeriodHours(period, now),
    [period, now],
  );

  const entityIds = entityId ? [entityId] : [];
  const history = useEntityHistory(entityIds, { hours, refreshMs });
  const pending = useEntityHistoryPending(entityIds, { hours, refreshMs });
  const points = entityId ? (history[entityId] ?? EMPTY_HISTORY_POINTS) : EMPTY_HISTORY_POINTS;

  const kwh = useMemo(
    () => computeEnergyKwh(points, period, now),
    [points, period, now],
  );

  const daily = useMemo(
    () => energyDailySeries(points, period, now),
    [points, period, now],
  );

  useEffect(() => {
    if (pending || kwh === undefined) return;
  }, [entityId, period, kwh, pending, points.length]);

  return {
    kwh,
    loading: pending,
    period,
    points,
    daily,
  };
}

export type { EnergyPeriod };
export {
  computeEnergyKwh,
  energyDailySeries,
  energyPeriodHours,
  energyPeriodLabel,
  energyPeriodStartMs,
} from '../energy';
