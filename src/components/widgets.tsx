import { callService, useEntity } from '../hass/hooks';
import {
  batteryColor,
  euro,
  isAvailable,
  num,
  stateNumber,
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
