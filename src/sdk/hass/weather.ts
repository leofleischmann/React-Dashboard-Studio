import { hassStore } from './store';

export type WeatherForecastType = 'daily' | 'hourly' | 'twice_daily';

export interface WeatherForecastEntry {
  datetime: Date;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation_probability?: number;
  humidity?: number;
  wind_speed?: number;
}

type ForecastRow = {
  datetime?: string;
  condition?: string;
  temperature?: number | null;
  templow?: number | null;
  precipitation_probability?: number | null;
  humidity?: number | null;
  wind_speed?: number | null;
};

function toNumber(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number.isFinite(value) ? value : undefined;
}

function parseForecastRows(rows: unknown): WeatherForecastEntry[] {
  if (!Array.isArray(rows)) return [];

  const out: WeatherForecastEntry[] = [];
  for (const row of rows as ForecastRow[]) {
    if (!row?.datetime) continue;
    const datetime = new Date(row.datetime);
    if (!Number.isFinite(datetime.getTime())) continue;
    out.push({
      datetime,
      condition: row.condition ?? undefined,
      temperature: toNumber(row.temperature),
      templow: toNumber(row.templow),
      precipitation_probability: toNumber(row.precipitation_probability),
      humidity: toNumber(row.humidity),
      wind_speed: toNumber(row.wind_speed),
    });
  }

  out.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  return out;
}

/** Fetch weather forecast via WebSocket `weather.get_forecasts`. */
export async function fetchWeatherForecast(
  entityId: string,
  type: WeatherForecastType = 'daily',
): Promise<WeatherForecastEntry[]> {
  const connection = hassStore.getHass()?.connection;
  if (!connection) {
    return [];
  }

  const result = (await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'weather',
    service: 'get_forecasts',
    target: { entity_id: entityId },
    service_data: { type },
    return_response: true,
  })) as { response?: Record<string, { forecast?: unknown }> };

  const rows = result.response?.[entityId]?.forecast;
  const parsed = parseForecastRows(rows);
  return parsed;
}

export const FORECAST_TYPE_PARAM: Record<WeatherForecastType, number> = {
  daily: 0,
  hourly: 1,
  twice_daily: 2,
};

export function forecastTypeFromParam(param: number): WeatherForecastType {
  if (param === 1) return 'hourly';
  if (param === 2) return 'twice_daily';
  return 'daily';
}

/** Batch fetch for shared cache (one entity per bucket in practice). */
export async function fetchWeatherForecastsBatch(
  entityIds: string[],
  param: number,
): Promise<Record<string, WeatherForecastEntry[]>> {
  const type = forecastTypeFromParam(param);
  const out: Record<string, WeatherForecastEntry[]> = {};
  await Promise.all(
    entityIds.map(async (id) => {
      out[id] = await fetchWeatherForecast(id, type);
    }),
  );
  return out;
}
