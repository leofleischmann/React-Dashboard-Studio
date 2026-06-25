import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  getWeatherForecastSnapshot,
  isWeatherForecastPending,
  subscribeWeatherForecast,
} from '../cachedWeather';
import {
  FORECAST_TYPE_PARAM,
  type WeatherForecastEntry,
  type WeatherForecastType,
} from '../weather';
import { normalizeIds } from '../restCache';
import { useHassReady } from './ready';
import { entityIdsFromKey } from './shared';

const EMPTY_WEATHER_FORECAST: WeatherForecastEntry[] = [];

export interface UseWeatherForecastOptions {
  /** Forecast resolution (default `daily`). */
  type?: WeatherForecastType;
  /** Max entries to return (default 5). */
  days?: number;
  refreshMs?: number;
}

export interface UseWeatherForecastResult {
  forecast: WeatherForecastEntry[];
  loading: boolean;
  type: WeatherForecastType;
}

/**
 * Weather forecast from `weather.get_forecasts` (WebSocket).
 *
 *   const { forecast, loading } = useWeatherForecast('weather.home', { days: 5 });
 */
export function useWeatherForecast(
  entityId: string,
  options: UseWeatherForecastOptions = {},
): UseWeatherForecastResult {
  const { type = 'daily', days = 5, refreshMs = 900_000 } = options;
  const typeParam = FORECAST_TYPE_PARAM[type];
  const ready = useHassReady();
  const idsKey = normalizeIds(entityId ? [entityId] : []);

  const getSnapshot = useCallback(() => {
    if (!ready || !entityId) return EMPTY_WEATHER_FORECAST;
    return (
      getWeatherForecastSnapshot(entityIdsFromKey(idsKey), typeParam)[entityId] ??
      EMPTY_WEATHER_FORECAST
    );
  }, [ready, entityId, idsKey, typeParam]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !entityId) return () => {};
      return subscribeWeatherForecast(
        entityIdsFromKey(idsKey),
        typeParam,
        refreshMs,
        listener,
      );
    },
    [ready, entityId, idsKey, typeParam, refreshMs],
  );

  const getPendingSnapshot = useCallback(() => {
    if (!ready || !entityId) return false;
    return isWeatherForecastPending(entityIdsFromKey(idsKey), typeParam);
  }, [ready, entityId, idsKey, typeParam]);

  const pending = useSyncExternalStore(subscribe, getPendingSnapshot, () => false);

  const all = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_WEATHER_FORECAST,
  );

  const forecast = useMemo(() => all.slice(0, days), [all, days]);

  useEffect(() => {
    if (pending || !entityId) return;
    console.log(
      '[Debug useWeatherForecast]:',
      entityId,
      type,
      forecast.length,
      'entries shown',
    );
  }, [entityId, type, forecast.length, pending]);

  return { forecast, loading: pending, type };
}
