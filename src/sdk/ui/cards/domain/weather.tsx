import { useEntity } from '../../../hass/hooks';
import { num, weatherIcon } from '../../../format';

export function WeatherCard({
  entityId,
  label,
  showHumidity = true,
  showWind = false,
  compact = false,
}: {
  entityId: string;
  label?: string;
  showHumidity?: boolean;
  showWind?: boolean;
  compact?: boolean;
}) {
  const weather = useEntity(entityId);
  const name = label ?? weather?.attributes.friendly_name ?? entityId;
  const temp = weather?.attributes.temperature;
  const condition = weather?.attributes.condition as string | undefined;
  const humidity = weather?.attributes.humidity;
  const windSpeed = weather?.attributes.wind_speed;
  const windUnit = (weather?.attributes.wind_speed_unit as string | undefined) ?? 'km/h';

  return (
    <div className={`rd-card rd-weather-card${compact ? ' rd-weather-card--compact' : ''}`}>
      {!compact && <span className="rd-weather-card__name">{name}</span>}
      <div className="rd-weather-card__main">
        <span className="rd-weather-card__icon">{weatherIcon(condition)}</span>
        <span className="rd-weather-card__temp">
          {num(temp !== undefined ? String(temp) : undefined)}
          <small> °C</small>
        </span>
        {compact && <span className="rd-weather-card__name">{name}</span>}
      </div>
      <div className="rd-weather-card__meta">
        <span>{condition ?? weather?.state ?? '–'}</span>
        {showHumidity && humidity !== undefined && (
          <span>💧 {num(String(humidity), 0)} %</span>
        )}
        {showWind && windSpeed !== undefined && (
          <span>💨 {num(String(windSpeed), 0)} {windUnit}</span>
        )}
      </div>
    </div>
  );
}
