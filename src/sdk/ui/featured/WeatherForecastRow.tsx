import { useWeatherForecast } from '../../hass/hooks';
import { forecastDayLabel, num, temp, weatherIcon } from '../../format';

export type WeatherForecastRowProps = {
  entityId: string;
  days?: number;
  type?: 'daily' | 'hourly' | 'twice_daily';
};

function formatTempRange(
  high: number | undefined,
  low: number | undefined,
): string {
  if (high !== undefined && low !== undefined && low !== high) {
    return `${num(high, 0)}/${num(low, 0)}°`;
  }
  if (high !== undefined) return temp(high, '°');
  if (low !== undefined) return temp(low, '°');
  return '–';
}

/** Compact horizontal forecast row (day + icon + min/max). */
export function WeatherForecastRow({
  entityId,
  days = 5,
  type = 'daily',
}: WeatherForecastRowProps) {
  const { forecast, loading } = useWeatherForecast(entityId, { days, type });
  const now = new Date();

  if (loading && forecast.length === 0) {
    return (
      <div className="rd-card rd-weather-forecast">
        <span className="rd-empty">Vorhersage lädt…</span>
      </div>
    );
  }

  if (forecast.length === 0) {
    return (
      <div className="rd-card rd-weather-forecast">
        <span className="rd-empty">Keine Vorhersagedaten</span>
      </div>
    );
  }

  return (
    <div className="rd-card rd-weather-forecast">
      {forecast.map((entry) => (
        <div key={entry.datetime.toISOString()} className="rd-weather-forecast__day">
          <span className="rd-weather-forecast__label">
            {forecastDayLabel(entry.datetime, now)}
          </span>
          <span className="rd-weather-forecast__icon" aria-hidden>
            {weatherIcon(entry.condition)}
          </span>
          <span className="rd-weather-forecast__temp">
            {formatTempRange(entry.temperature, entry.templow)}
          </span>
          {entry.precipitation_probability !== undefined && (
            <span className="rd-weather-forecast__rain">
              {num(entry.precipitation_probability, 0)} %
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
