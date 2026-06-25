import { createSharedRestCache } from './restCache';
import type { WeatherForecastEntry } from './weather';
import { fetchWeatherForecastsBatch } from './weather';

const forecastCache = createSharedRestCache(fetchWeatherForecastsBatch, {});

export function subscribeWeatherForecast(
  entityIds: readonly string[],
  typeParam: number,
  refreshMs: number,
  listener: () => void,
): () => void {
  return forecastCache.subscribe(entityIds, typeParam, refreshMs, listener);
}

export function getWeatherForecastSnapshot(
  entityIds: readonly string[],
  typeParam: number,
): Record<string, WeatherForecastEntry[]> {
  return forecastCache.getSnapshot(entityIds, typeParam);
}

export function isWeatherForecastPending(
  entityIds: readonly string[],
  typeParam: number,
): boolean {
  return forecastCache.isPending(entityIds, typeParam);
}
