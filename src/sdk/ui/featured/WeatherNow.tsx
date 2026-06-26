import { useEntity } from '../../hass/hooks';
import { num, stateLabel, temp, weatherIcon } from '../../format';
import { WeatherForecastRow } from './WeatherForecastRow';
import './WeatherNow.css';

export type WeatherMetric = 'apparent' | 'humidity' | 'wind' | 'pressure';

export type WeatherNowProps = {
  entityId: string;
  /** BCP 47 locale for forecast weekday labels (default `de-DE`). */
  locale?: string;
  /** Show the metric tiles (feels-like, humidity, wind, pressure) (default true). */
  showMetrics?: boolean;
  /** Which metrics to show, in order — defaults to all that the entity provides. */
  metrics?: WeatherMetric[];
  /** Embed the multi-day forecast row beside the hero (default true). */
  showForecast?: boolean;
  /** Number of forecast entries (default 5). */
  forecastDays?: number;
  /** Forecast granularity (default `daily`). */
  forecastType?: 'daily' | 'hourly' | 'twice_daily';
  /** Show precipitation probability in the forecast (default true). */
  showPrecipitation?: boolean;
  /** `compact` scales the hero down for tight layouts. */
  size?: 'compact' | 'default';
};

type MetricRow = { key: WeatherMetric; ico: string; label: string; value: string };

const METRIC_ORDER: WeatherMetric[] = ['apparent', 'humidity', 'wind', 'pressure'];

function buildMetrics(
  a: Record<string, unknown>,
  selected: WeatherMetric[],
): MetricRow[] {
  const rows: Partial<Record<WeatherMetric, MetricRow>> = {};

  if (a.apparent_temperature != null) {
    rows.apparent = {
      key: 'apparent',
      ico: '🌡️',
      label: 'Gefühlt',
      value: temp(a.apparent_temperature as number, '°'),
    };
  }
  if (a.humidity != null) {
    rows.humidity = {
      key: 'humidity',
      ico: '💧',
      label: 'Feuchte',
      value: `${num(a.humidity as number, 0)}%`,
    };
  }
  if (a.wind_speed != null) {
    rows.wind = {
      key: 'wind',
      ico: '💨',
      label: 'Wind',
      value: `${num(a.wind_speed as number, 0)} ${String(a.wind_speed_unit ?? 'km/h')}`,
    };
  }
  if (a.pressure != null) {
    rows.pressure = {
      key: 'pressure',
      ico: '📊',
      label: 'Druck',
      value: `${num(a.pressure as number, 0)} ${String(a.pressure_unit ?? 'hPa')}`,
    };
  }

  return selected.map((key) => rows[key]).filter((r): r is MetricRow => r != null);
}

/**
 * Current-conditions weather hero — large glyph, temperature and condition with
 * a tidy metric grid, optionally paired with a multi-day forecast row. Ported
 * from the default dashboard's home weather panel.
 */
export function WeatherNow({
  entityId,
  locale = 'de-DE',
  showMetrics = true,
  metrics = METRIC_ORDER,
  showForecast = true,
  forecastDays = 5,
  forecastType = 'daily',
  showPrecipitation = true,
  size = 'default',
}: WeatherNowProps) {
  const weather = useEntity(entityId);

  if (!weather) {
    return (
      <div className="rd-wxn rd-wxn--empty">
        <span className="rd-empty">Keine Wetterdaten</span>
      </div>
    );
  }

  const a = weather.attributes as Record<string, unknown>;
  const t = a.temperature as number | undefined;
  const metricRows = showMetrics ? buildMetrics(a, metrics) : [];

  return (
    <div className={`rd-wxn${size === 'compact' ? ' rd-wxn--compact' : ''}`}>
      <div className="rd-wxn__main">
        <div className="rd-wxn__hero">
          <span className="rd-wxn__glyph" aria-hidden>
            {weatherIcon(weather.state)}
          </span>
          <div className="rd-wxn__read">
            <div className="rd-wxn__temp">
              {num(t)}
              <small>°</small>
            </div>
            <div className="rd-wxn__cond">{stateLabel(weather.state)}</div>
          </div>
        </div>

        {metricRows.length > 0 && (
          <div className="rd-wxn__metrics">
            {metricRows.map((m) => (
              <div key={m.key} className="rd-wxn__metric">
                <span className="rd-wxn__metric-ico" aria-hidden>
                  {m.ico}
                </span>
                <span className="rd-wxn__metric-val">{m.value}</span>
                <span className="rd-wxn__metric-label">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForecast && (
        <div className="rd-wxn__forecast">
          <WeatherForecastRow
            entityId={entityId}
            days={forecastDays}
            type={forecastType}
            locale={locale}
            showPrecipitation={showPrecipitation}
            compact={size === 'compact'}
          />
        </div>
      )}
    </div>
  );
}
