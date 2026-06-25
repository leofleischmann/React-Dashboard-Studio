import { callService, useEntity } from '../hass/hooks';
import {
  defaultEntityService,
  entityDomain,
  TOGGLE_DOMAINS,
} from '../lib/entityActions';
import {
  batteryColor,
  euro,
  isAvailable,
  num,
  stateNumber,
  weatherIcon,
} from '../lib/format';

/** Generic card container — the basic building block. */
export function Card({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div className="rd-card" style={style} onClick={onClick}>
      {children}
    </div>
  );
}

/** Section wrapper with a title. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rd-section">
      <h2 className="rd-section__title">{title}</h2>
      {children}
    </section>
  );
}

/** A climate card for one room. Sensor IDs follow the `sensor_<key>_*` pattern. */
export function RoomCard({
  name,
  sensorKey,
  lightId,
}: {
  name: string;
  sensorKey: string;
  lightId?: string;
}) {
  const temp = useEntity(`sensor.sensor_${sensorKey}_temperature`);
  const humidity = useEntity(`sensor.sensor_${sensorKey}_humidity`);
  const lux = useEntity(`sensor.sensor_${sensorKey}_illuminance`);
  const presence = useEntity(`binary_sensor.sensor_${sensorKey}_presence`);
  const light = useEntity(lightId ?? '');

  const occupied = presence?.state === 'on';
  const lightOn = light?.state === 'on';
  const lightUsable = isAvailable(light);

  return (
    <div className="rd-card rd-room">
      <div className="rd-room__head">
        <span className="rd-room__name">{name}</span>
        <span className={`rd-dot ${occupied ? 'is-on' : ''}`} title={occupied ? 'belegt' : 'frei'} />
      </div>

      <div className="rd-room__temp">
        {num(temp?.state)}
        <small>°C</small>
      </div>

      <div className="rd-room__metrics">
        <span>💧 {num(humidity?.state, 0)} %</span>
        <span>💡 {num(lux?.state, 0)} lx</span>
      </div>

      {lightId && (
        <button
          className={`rd-pill ${lightOn ? 'is-on' : ''}`}
          disabled={!lightUsable}
          onClick={() => callService('light', 'toggle', { entity_id: lightId })}
        >
          {lightUsable ? (lightOn ? 'Licht an' : 'Licht aus') : 'nicht verfügbar'}
        </button>
      )}
    </div>
  );
}

/** A power/energy card for a switchable device. */
export function DeviceCard({
  name,
  powerId,
  kwhId,
  costId,
  switchId,
}: {
  name: string;
  powerId: string;
  kwhId: string;
  costId: string;
  switchId: string;
}) {
  const power = useEntity(powerId);
  const kwh = useEntity(kwhId);
  const cost = useEntity(costId);
  const sw = useEntity(switchId);

  const watts = stateNumber(power) ?? 0;
  const on = sw?.state === 'on';
  // Visual bar: scale 0..150 W
  const barPct = Math.min(100, (watts / 150) * 100);

  return (
    <div className="rd-card rd-device">
      <div className="rd-device__head">
        <span className="rd-device__name">{name}</span>
        <button
          className={`rd-switch ${on ? 'is-on' : ''}`}
          disabled={!isAvailable(sw)}
          onClick={() => callService('switch', 'toggle', { entity_id: switchId })}
          aria-label={`${name} schalten`}
        >
          <span className="rd-switch__knob" />
        </button>
      </div>

      <div className="rd-device__power">
        {num(power?.state)}
        <small> W</small>
      </div>
      <div className="rd-bar">
        <div className="rd-bar__fill" style={{ width: `${barPct}%` }} />
      </div>

      <div className="rd-device__foot">
        <span>{num(kwh?.state)} kWh / Monat</span>
        <span>{euro(cost?.state)}</span>
      </div>
    </div>
  );
}

const BULB_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2a7 7 0 0 0-4 12.74V16a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.26A7 7 0 0 0 12 2Zm-3 17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9v1Z"
    />
  </svg>
);

/**
 * A tappable tile for a single light. Glows when on and shows the brightness
 * if the light reports one. Toggles the light on click.
 */
export function LightTile({ entityId, name }: { entityId: string; name?: string }) {
  const light = useEntity(entityId);
  const on = light?.state === 'on';
  const label = name ?? light?.attributes.friendly_name ?? entityId;
  const brightnessRaw = light?.attributes.brightness;
  const brightness =
    typeof brightnessRaw === 'number'
      ? Math.max(1, Math.round((brightnessRaw / 255) * 100))
      : undefined;

  return (
    <button
      className={`rd-light ${on ? 'is-on' : ''}`}
      onClick={() => callService('light', 'toggle', { entity_id: entityId })}
      aria-pressed={on}
    >
      <span className="rd-light__icon">{BULB_ICON}</span>
      <span className="rd-light__name">{label}</span>
      <span className="rd-light__state">
        {on ? (brightness !== undefined ? `${brightness} %` : 'an') : 'aus'}
      </span>
    </button>
  );
}

/** A single battery row with a colored bar. */
export function BatteryRow({ name, entityId }: { name: string; entityId: string }) {
  const battery = useEntity(entityId);
  const pct = stateNumber(battery);
  return (
    <div className="rd-batt">
      <span className="rd-batt__name">{name}</span>
      <div className="rd-batt__track">
        <div
          className="rd-batt__fill"
          style={{ width: `${pct ?? 0}%`, background: batteryColor(pct) }}
        />
      </div>
      <span className="rd-batt__val">{pct === undefined ? '–' : `${pct} %`}</span>
    </div>
  );
}

/** A small labelled stat tile. */
export function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rd-card rd-stat ${accent ? 'is-accent' : ''}`}>
      <span className="rd-stat__label">{label}</span>
      <span className="rd-stat__value">
        {value}
        {unit && <small> {unit}</small>}
      </span>
    </div>
  );
}

/** Responsive grid — `min` sets the minimum column width in px. */
export function Grid({
  children,
  min = 180,
}: {
  children: React.ReactNode;
  min?: number;
}) {
  return (
    <div className="rd-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}

/** Generic entity row — state + optional toggle for switchable domains. */
export function EntityRow({
  entityId,
  label,
  toggle = 'auto',
}: {
  entityId: string;
  label?: string;
  toggle?: boolean | 'auto';
}) {
  const entity = useEntity(entityId);
  const domain = entityDomain(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const unit = entity?.attributes.unit_of_measurement;
  const showToggle =
    toggle === 'auto' ? TOGGLE_DOMAINS.has(domain) : toggle;
  const on = entity?.state === 'on' || entity?.state === 'open' || entity?.state === 'unlocked';

  return (
    <div className="rd-card rd-entity-row">
      <div className="rd-entity-row__main">
        <span className="rd-entity-row__name">{name}</span>
        <span className="rd-entity-row__id">{entityId}</span>
      </div>
      <div className="rd-entity-row__side">
        <span className="rd-entity-row__state">
          {entity?.state ?? '–'}
          {unit ? ` ${unit}` : ''}
        </span>
        {showToggle && (
          <button
            className={`rd-switch ${on ? 'is-on' : ''}`}
            disabled={!isAvailable(entity)}
            aria-label={`${name} schalten`}
            onClick={() =>
              callService(domain, defaultEntityService(entityId), { entity_id: entityId })
            }
          >
            <span className="rd-switch__knob" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Numeric sensor with a horizontal gauge (default 0–100). */
export function Gauge({
  entityId,
  label,
  min = 0,
  max = 100,
  unit,
}: {
  entityId: string;
  label?: string;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const entity = useEntity(entityId);
  const value = stateNumber(entity);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const u = unit ?? (entity?.attributes.unit_of_measurement as string | undefined);
  const pct =
    value === undefined ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="rd-card rd-gauge">
      <div className="rd-gauge__head">
        <span className="rd-gauge__name">{name}</span>
        <span className="rd-gauge__value">
          {num(entity?.state)}
          {u && <small> {u}</small>}
        </span>
      </div>
      <div className="rd-bar">
        <div className="rd-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Press button for script, scene, button, automation, … */
export function ActionButton({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const entity = useEntity(entityId);
  const domain = entityDomain(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const service = defaultEntityService(entityId);

  return (
    <button
      className="rd-card rd-action-btn"
      disabled={!isAvailable(entity)}
      onClick={() => callService(domain, service, { entity_id: entityId })}
    >
      <span className="rd-action-btn__name">{name}</span>
      <span className="rd-action-btn__hint">{domain}.{service}</span>
    </button>
  );
}

/** Climate entity — current/target temperature and HVAC mode. */
export function ClimateCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const climate = useEntity(entityId);
  const name = label ?? climate?.attributes.friendly_name ?? entityId;
  const current = climate?.attributes.current_temperature;
  const target = climate?.attributes.temperature;
  const mode = climate?.attributes.hvac_mode ?? climate?.state;

  return (
    <div className="rd-card rd-climate">
      <div className="rd-climate__head">
        <span className="rd-climate__name">{name}</span>
        <span className="rd-climate__mode">{String(mode ?? '–')}</span>
      </div>
      <div className="rd-climate__temps">
        <span>
          {num(current !== undefined ? String(current) : undefined)}
          <small> °C ist</small>
        </span>
        <span className="rd-climate__target">
          → {num(target !== undefined ? String(target) : undefined)}
          <small> °C soll</small>
        </span>
      </div>
      <button
        className="rd-pill"
        disabled={!isAvailable(climate)}
        onClick={() => callService('climate', 'toggle', { entity_id: entityId })}
      >
        Klima umschalten
      </button>
    </div>
  );
}

/** Binary sensor / motion — on/off badge. */
export function BinaryBadge({
  entityId,
  label,
  onLabel = 'an',
  offLabel = 'aus',
}: {
  entityId: string;
  label?: string;
  onLabel?: string;
  offLabel?: string;
}) {
  const entity = useEntity(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const on = entity?.state === 'on';

  return (
    <div className={`rd-card rd-binary ${on ? 'is-on' : ''}`}>
      <span className="rd-binary__dot" />
      <div className="rd-binary__text">
        <span className="rd-binary__name">{name}</span>
        <span className="rd-binary__state">{on ? onLabel : offLabel}</span>
      </div>
    </div>
  );
}

/** Media player — title, play/pause, volume. */
export function MediaPlayerCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const player = useEntity(entityId);
  const name = label ?? player?.attributes.friendly_name ?? entityId;
  const title = (player?.attributes.media_title as string | undefined) ?? '–';
  const artist = player?.attributes.media_artist as string | undefined;
  const playing = player?.state === 'playing';
  const volRaw = player?.attributes.volume_level;
  const volume =
    typeof volRaw === 'number' ? Math.round(volRaw * 100) : undefined;
  const usable = isAvailable(player);

  return (
    <div className="rd-card rd-media">
      <div className="rd-media__head">
        <span className="rd-media__name">{name}</span>
        <button
          className={`rd-media__play ${playing ? 'is-playing' : ''}`}
          disabled={!usable}
          aria-label={playing ? 'Pause' : 'Abspielen'}
          onClick={() =>
            callService('media_player', 'media_play_pause', { entity_id: entityId })
          }
        >
          {playing ? '⏸' : '▶'}
        </button>
      </div>
      <div className="rd-media__track">
        <span className="rd-media__title">{title}</span>
        {artist && <span className="rd-media__artist">{artist}</span>}
      </div>
      {volume !== undefined && (
        <div className="rd-media__vol">
          <span className="rd-media__vol-label">🔊 {volume} %</span>
          <input
            type="range"
            className="rd-slider__input"
            min={0}
            max={100}
            step={1}
            value={volume}
            disabled={!usable}
            onChange={(e) =>
              callService('media_player', 'volume_set', {
                entity_id: entityId,
                volume_level: Number(e.target.value) / 100,
              })
            }
          />
        </div>
      )}
    </div>
  );
}

/** Cover / Rollladen — open, close, stop. */
export function CoverCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const cover = useEntity(entityId);
  const name = label ?? cover?.attributes.friendly_name ?? entityId;
  const state = cover?.state ?? '–';
  const open = state === 'open';
  const usable = isAvailable(cover);

  return (
    <div className="rd-card rd-cover">
      <div className="rd-cover__head">
        <span className="rd-cover__name">{name}</span>
        <span className={`rd-cover__state ${open ? 'is-open' : ''}`}>{state}</span>
      </div>
      <div className="rd-cover__actions">
        <button
          className="rd-cover__btn"
          disabled={!usable}
          onClick={() => callService('cover', 'open_cover', { entity_id: entityId })}
        >
          ↑ Offen
        </button>
        <button
          className="rd-cover__btn"
          disabled={!usable}
          onClick={() => callService('cover', 'stop_cover', { entity_id: entityId })}
        >
          ■ Stop
        </button>
        <button
          className="rd-cover__btn"
          disabled={!usable}
          onClick={() => callService('cover', 'close_cover', { entity_id: entityId })}
        >
          ↓ Zu
        </button>
      </div>
    </div>
  );
}

/** Weather entity — icon, temperature, condition. */
export function WeatherCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const weather = useEntity(entityId);
  const name = label ?? weather?.attributes.friendly_name ?? entityId;
  const temp = weather?.attributes.temperature;
  const condition = weather?.attributes.condition as string | undefined;
  const humidity = weather?.attributes.humidity;

  return (
    <div className="rd-card rd-weather-card">
      <span className="rd-weather-card__name">{name}</span>
      <div className="rd-weather-card__main">
        <span className="rd-weather-card__icon">{weatherIcon(condition)}</span>
        <span className="rd-weather-card__temp">
          {num(temp !== undefined ? String(temp) : undefined)}
          <small> °C</small>
        </span>
      </div>
      <div className="rd-weather-card__meta">
        <span>{condition ?? weather?.state ?? '–'}</span>
        {humidity !== undefined && <span>💧 {num(String(humidity), 0)} %</span>}
      </div>
    </div>
  );
}

/** Person or device_tracker — home / away chip. */
export function PersonChip({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const entity = useEntity(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const home = entity?.state === 'home' || entity?.state === 'on';

  return (
    <div className={`rd-card rd-person-chip ${home ? 'is-home' : ''}`}>
      <span className="rd-person-chip__avatar">{home ? '🏠' : '🚶'}</span>
      <div className="rd-person-chip__text">
        <span className="rd-person-chip__name">{name}</span>
        <span className="rd-person-chip__state">{home ? 'Zuhause' : 'Abwesend'}</span>
      </div>
    </div>
  );
}

/** Slider for `input_number` or light brightness (`brightness_pct`). */
export function NumberSlider({
  entityId,
  label,
  min,
  max,
  step,
}: {
  entityId: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const entity = useEntity(entityId);
  const domain = entityDomain(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const usable = isAvailable(entity);

  const minVal =
    min ??
    (domain === 'light' ? 0 : (entity?.attributes.min as number | undefined) ?? 0);
  const maxVal =
    max ??
    (domain === 'light' ? 100 : (entity?.attributes.max as number | undefined) ?? 100);
  const stepVal =
    step ?? (entity?.attributes.step as number | undefined) ?? (domain === 'light' ? 1 : 1);

  let value = minVal;
  if (domain === 'light') {
    const b = entity?.attributes.brightness;
    value =
      entity?.state === 'on' && typeof b === 'number'
        ? Math.round((b / 255) * 100)
        : 0;
  } else {
    value = stateNumber(entity) ?? minVal;
  }

  const setValue = (next: number) => {
    if (domain === 'light') {
      void callService('light', 'turn_on', {
        entity_id: entityId,
        brightness_pct: next,
      });
    } else {
      void callService('input_number', 'set_value', {
        entity_id: entityId,
        value: next,
      });
    }
  };

  return (
    <div className="rd-card rd-slider">
      <div className="rd-slider__head">
        <span className="rd-slider__name">{name}</span>
        <span className="rd-slider__value">
          {value}
          {domain === 'light' ? ' %' : ''}
        </span>
      </div>
      <input
        type="range"
        className="rd-slider__input"
        min={minVal}
        max={maxVal}
        step={stepVal}
        value={value}
        disabled={!usable}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}

export {
  SelectCard,
  LockCard,
  VacuumCard,
  FanCard,
  AlarmPanel,
  CameraTile,
  TimerCard,
  CounterCard,
  SceneButton,
  ScriptButton,
  HumidifierCard,
  WaterHeaterCard,
  ValveCard,
  SirenCard,
  UpdateCard,
  DeviceTrackerChip,
  InputBooleanTile,
  CalendarCard,
} from './domainWidgets';

export { SparkChart, HistoryChart, type ChartSeries } from './charts';
