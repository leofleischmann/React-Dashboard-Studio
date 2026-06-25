import { useEffect, useState } from 'react';
import { callService, useCalendarEvents, useEntity } from '../hass/hooks';
import { entityDomain } from '../entityActions';
import {
  duration,
  entityDisplayName,
  isAvailable,
  num,
  pct,
  stateColor,
  stateLabel,
  temp,
} from '../format';

function cameraProxyUrl(entityId: string, cacheBust: number): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? '/__ha-api'
      : '/api';
  return `${base}/camera_proxy/${entityId}?t=${cacheBust}`;
}

/** Dropdown for `input_select` or `select.*` entities. */
export function SelectCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const entity = useEntity(entityId);
  const name = label ?? entityDisplayName(entity, entityId);
  const options = (entity?.attributes.options as string[] | undefined) ?? [];
  const domain = entityDomain(entityId);
  const usable = isAvailable(entity) && options.length > 0;

  return (
    <div className="rd-card rd-select">
      <span className="rd-select__name">{name}</span>
      <select
        className="rd-select__input"
        value={entity?.state ?? ''}
        disabled={!usable}
        onChange={(e) =>
          callService(domain, 'select_option', {
            entity_id: entityId,
            option: e.target.value,
          })
        }
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Lock entity — lock / unlock controls. */
export function LockCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const lock = useEntity(entityId);
  const name = label ?? entityDisplayName(lock, entityId);
  const locked = lock?.state === 'locked';
  const usable = isAvailable(lock);

  return (
    <div className="rd-card rd-lock">
      <div className="rd-lock__head">
        <span className="rd-lock__name">{name}</span>
        <span
          className="rd-lock__state"
          style={{ color: stateColor(lock?.state) }}
        >
          {stateLabel(lock?.state, 'lock')}
        </span>
      </div>
      <div className="rd-lock__actions">
        <button
          type="button"
          className="rd-lock__btn"
          disabled={!usable || locked}
          onClick={() => callService('lock', 'lock', { entity_id: entityId })}
        >
          🔒 Verriegeln
        </button>
        <button
          type="button"
          className="rd-lock__btn"
          disabled={!usable || !locked}
          onClick={() => callService('lock', 'unlock', { entity_id: entityId })}
        >
          🔓 Entriegeln
        </button>
      </div>
    </div>
  );
}

/** Vacuum — start, pause, dock. */
export function VacuumCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const vacuum = useEntity(entityId);
  const name = label ?? entityDisplayName(vacuum, entityId);
  const state = vacuum?.state ?? '–';
  const battery = vacuum?.attributes.battery_level as number | undefined;
  const usable = isAvailable(vacuum);
  const cleaning = state === 'cleaning';

  return (
    <div className="rd-card rd-vacuum">
      <div className="rd-vacuum__head">
        <span className="rd-vacuum__name">{name}</span>
        <span className="rd-vacuum__state" style={{ color: stateColor(state) }}>
          {stateLabel(state, 'vacuum')}
        </span>
      </div>
      {battery !== undefined && (
        <span className="rd-vacuum__battery">🔋 {pct(String(battery))}</span>
      )}
      <div className="rd-vacuum__actions">
        <button
          type="button"
          className="rd-vacuum__btn"
          disabled={!usable}
          onClick={() =>
            callService('vacuum', cleaning ? 'pause' : 'start', {
              entity_id: entityId,
            })
          }
        >
          {cleaning ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          type="button"
          className="rd-vacuum__btn"
          disabled={!usable}
          onClick={() =>
            callService('vacuum', 'return_to_base', { entity_id: entityId })
          }
        >
          🏠 Dock
        </button>
      </div>
    </div>
  );
}

/** Fan — toggle and optional speed percentage. */
export function FanCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const fan = useEntity(entityId);
  const name = label ?? entityDisplayName(fan, entityId);
  const on = fan?.state === 'on';
  const speedPct = fan?.attributes.percentage as number | undefined;
  const usable = isAvailable(fan);

  return (
    <div className="rd-card rd-fan">
      <div className="rd-fan__head">
        <span className="rd-fan__name">{name}</span>
        <button
          type="button"
          className={`rd-switch ${on ? 'is-on' : ''}`}
          disabled={!usable}
          aria-label={`${name} schalten`}
          onClick={() => callService('fan', 'toggle', { entity_id: entityId })}
        >
          <span className="rd-switch__knob" />
        </button>
      </div>
      {speedPct !== undefined && (
        <div className="rd-fan__speed">
          <span>{pct(String(speedPct))}</span>
          <input
            type="range"
            className="rd-slider__input"
            min={0}
            max={100}
            step={1}
            value={on ? speedPct : 0}
            disabled={!usable}
            onChange={(e) =>
              callService('fan', 'set_percentage', {
                entity_id: entityId,
                percentage: Number(e.target.value),
              })
            }
          />
        </div>
      )}
    </div>
  );
}

/** Alarm control panel — arm / disarm shortcuts. */
export function AlarmPanel({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const alarm = useEntity(entityId);
  const name = label ?? entityDisplayName(alarm, entityId);
  const state = alarm?.state ?? '–';
  const usable = isAvailable(alarm);

  return (
    <div className={`rd-card rd-alarm ${state.includes('armed') ? 'is-armed' : ''}`}>
      <div className="rd-alarm__head">
        <span className="rd-alarm__name">{name}</span>
        <span className="rd-alarm__state" style={{ color: stateColor(state) }}>
          {stateLabel(state, 'alarm_control_panel')}
        </span>
      </div>
      <div className="rd-alarm__actions">
        <button
          type="button"
          className="rd-alarm__btn"
          disabled={!usable}
          onClick={() =>
            callService('alarm_control_panel', 'alarm_arm_home', {
              entity_id: entityId,
            })
          }
        >
          🏠 Zuhause
        </button>
        <button
          type="button"
          className="rd-alarm__btn"
          disabled={!usable}
          onClick={() =>
            callService('alarm_control_panel', 'alarm_arm_away', {
              entity_id: entityId,
            })
          }
        >
          🚶 Abwesend
        </button>
        <button
          type="button"
          className="rd-alarm__btn rd-alarm__btn--off"
          disabled={!usable}
          onClick={() =>
            callService('alarm_control_panel', 'alarm_disarm', {
              entity_id: entityId,
            })
          }
        >
          Aus
        </button>
      </div>
    </div>
  );
}

/** Camera snapshot tile (refreshes periodically). */
export function CameraTile({
  entityId,
  label,
  refreshSec = 10,
}: {
  entityId: string;
  label?: string;
  refreshSec?: number;
}) {
  const camera = useEntity(entityId);
  const name = label ?? entityDisplayName(camera, entityId);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), refreshSec * 1000);
    return () => window.clearInterval(id);
  }, [refreshSec]);

  const src = cameraProxyUrl(entityId, tick);

  return (
    <div className="rd-card rd-camera">
      <span className="rd-camera__name">{name}</span>
      <img
        className="rd-camera__img"
        src={src}
        alt={name}
        loading="lazy"
      />
    </div>
  );
}

/** Timer — remaining time and cancel. */
export function TimerCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const timer = useEntity(entityId);
  const name = label ?? entityDisplayName(timer, entityId);
  const active = timer?.state === 'active';
  const remaining = timer?.attributes.remaining as string | undefined;
  const usable = isAvailable(timer);

  const remainingSec =
    typeof remaining === 'string'
      ? remaining.split(':').reduce((acc, part, i, arr) => {
          const n = Number.parseInt(part, 10);
          if (i === arr.length - 1) return acc + n;
          if (i === arr.length - 2) return acc + n * 60;
          return acc + n * 3600;
        }, 0)
      : undefined;

  return (
    <div className={`rd-card rd-timer ${active ? 'is-active' : ''}`}>
      <div className="rd-timer__head">
        <span className="rd-timer__name">{name}</span>
        <span className="rd-timer__state" style={{ color: stateColor(timer?.state) }}>
          {stateLabel(timer?.state, 'timer')}
        </span>
      </div>
      <span className="rd-timer__remaining">
        {active && remaining ? duration(remainingSec) : '–'}
      </span>
      <div className="rd-timer__actions">
        <button
          type="button"
          className="rd-timer__btn"
          disabled={!usable || active}
          onClick={() => callService('timer', 'start', { entity_id: entityId })}
        >
          ▶ Start
        </button>
        <button
          type="button"
          className="rd-timer__btn"
          disabled={!usable || !active}
          onClick={() => callService('timer', 'cancel', { entity_id: entityId })}
        >
          ■ Stop
        </button>
      </div>
    </div>
  );
}

/** Counter — value with increment / decrement / reset. */
export function CounterCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const counter = useEntity(entityId);
  const name = label ?? entityDisplayName(counter, entityId);
  const value = num(counter?.state, 0);
  const usable = isAvailable(counter);

  return (
    <div className="rd-card rd-counter">
      <span className="rd-counter__name">{name}</span>
      <span className="rd-counter__value">{value}</span>
      <div className="rd-counter__actions">
        <button
          type="button"
          className="rd-counter__btn"
          disabled={!usable}
          onClick={() =>
            callService('counter', 'decrement', { entity_id: entityId })
          }
        >
          −
        </button>
        <button
          type="button"
          className="rd-counter__btn"
          disabled={!usable}
          onClick={() =>
            callService('counter', 'increment', { entity_id: entityId })
          }
        >
          +
        </button>
        <button
          type="button"
          className="rd-counter__btn"
          disabled={!usable}
          onClick={() => callService('counter', 'reset', { entity_id: entityId })}
        >
          ↺
        </button>
      </div>
    </div>
  );
}

/** One-tap scene activation. */
export function SceneButton({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const scene = useEntity(entityId);
  const name = label ?? entityDisplayName(scene, entityId);
  const usable = isAvailable(scene);

  return (
    <button
      type="button"
      className="rd-card rd-scene-btn"
      disabled={!usable}
      onClick={() => callService('scene', 'turn_on', { entity_id: entityId })}
    >
      <span className="rd-scene-btn__icon">🎬</span>
      <span className="rd-scene-btn__name">{name}</span>
    </button>
  );
}

/** One-tap script execution. */
export function ScriptButton({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const script = useEntity(entityId);
  const name = label ?? entityDisplayName(script, entityId);
  const usable = isAvailable(script);

  return (
    <button
      type="button"
      className="rd-card rd-script-btn"
      disabled={!usable}
      onClick={() => callService('script', 'turn_on', { entity_id: entityId })}
    >
      <span className="rd-script-btn__icon">📜</span>
      <span className="rd-script-btn__name">{name}</span>
    </button>
  );
}

/** Humidifier — toggle and target humidity. */
export function HumidifierCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const unit = useEntity(entityId);
  const name = label ?? entityDisplayName(unit, entityId);
  const on = unit?.state === 'on';
  const target = unit?.attributes.humidity as number | undefined;
  const current = unit?.attributes.current_humidity as number | undefined;
  const usable = isAvailable(unit);

  return (
    <div className="rd-card rd-humidifier">
      <div className="rd-humidifier__head">
        <span className="rd-humidifier__name">{name}</span>
        <button
          type="button"
          className={`rd-switch ${on ? 'is-on' : ''}`}
          disabled={!usable}
          onClick={() => callService('humidifier', 'toggle', { entity_id: entityId })}
        >
          <span className="rd-switch__knob" />
        </button>
      </div>
      <div className="rd-humidifier__metrics">
        <span>Ist: {pct(current !== undefined ? String(current) : undefined)}</span>
        <span>Soll: {pct(target !== undefined ? String(target) : undefined)}</span>
      </div>
    </div>
  );
}

/** Water heater — temperature and mode. */
export function WaterHeaterCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const heater = useEntity(entityId);
  const name = label ?? entityDisplayName(heater, entityId);
  const current = heater?.attributes.current_temperature;
  const target = heater?.attributes.temperature;
  const mode = heater?.attributes.operation_mode ?? heater?.state;
  const usable = isAvailable(heater);

  return (
    <div className="rd-card rd-water-heater">
      <span className="rd-water-heater__name">{name}</span>
      <div className="rd-water-heater__temps">
        <strong>{temp(current !== undefined ? String(current) : undefined)}</strong>
        <span>→ {temp(target !== undefined ? String(target) : undefined)}</span>
      </div>
      <span className="rd-water-heater__mode">{stateLabel(String(mode), 'water_heater')}</span>
      <button
        type="button"
        className="rd-pill"
        disabled={!usable}
        onClick={() => callService('water_heater', 'toggle', { entity_id: entityId })}
      >
        Umschalten
      </button>
    </div>
  );
}

/** Valve — open / close. */
export function ValveCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const valve = useEntity(entityId);
  const name = label ?? entityDisplayName(valve, entityId);
  const usable = isAvailable(valve);

  return (
    <div className="rd-card rd-valve">
      <div className="rd-valve__head">
        <span className="rd-valve__name">{name}</span>
        <span style={{ color: stateColor(valve?.state) }}>
          {stateLabel(valve?.state, 'valve')}
        </span>
      </div>
      <div className="rd-valve__actions">
        <button
          type="button"
          className="rd-valve__btn"
          disabled={!usable}
          onClick={() => callService('valve', 'open_valve', { entity_id: entityId })}
        >
          Öffnen
        </button>
        <button
          type="button"
          className="rd-valve__btn"
          disabled={!usable}
          onClick={() => callService('valve', 'close_valve', { entity_id: entityId })}
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

/** Siren — toggle alarm. */
export function SirenCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const siren = useEntity(entityId);
  const name = label ?? entityDisplayName(siren, entityId);
  const on = siren?.state === 'on';
  const usable = isAvailable(siren);

  return (
    <div className={`rd-card rd-siren ${on ? 'is-on' : ''}`}>
      <span className="rd-siren__name">{name}</span>
      <button
        type="button"
        className={`rd-pill ${on ? 'is-on' : ''}`}
        disabled={!usable}
        onClick={() => callService('siren', 'toggle', { entity_id: entityId })}
      >
        {on ? '🔔 An' : '🔕 Aus'}
      </button>
    </div>
  );
}

/** Firmware update entity. */
export function UpdateCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const update = useEntity(entityId);
  const name = label ?? entityDisplayName(update, entityId);
  const state = update?.state ?? '–';
  const version = update?.attributes.installed_version as string | undefined;
  const latest = update?.attributes.latest_version as string | undefined;
  const usable = isAvailable(update);
  const available = state === 'on' || state === 'available';

  return (
    <div className={`rd-card rd-update ${available ? 'has-update' : ''}`}>
      <span className="rd-update__name">{name}</span>
      <div className="rd-update__versions">
        <span>{version ?? '–'}</span>
        {latest && available && <span>→ {latest}</span>}
      </div>
      <span className="rd-update__state" style={{ color: stateColor(state) }}>
        {available ? 'Update verfügbar' : stateLabel(state, 'update')}
      </span>
      {available && (
        <button
          type="button"
          className="rd-pill"
          disabled={!usable}
          onClick={() => callService('update', 'install', { entity_id: entityId })}
        >
          Installieren
        </button>
      )}
    </div>
  );
}

/** Device tracker chip — home / away. */
export function DeviceTrackerChip({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const tracker = useEntity(entityId);
  const name = label ?? entityDisplayName(tracker, entityId);
  const home = tracker?.state === 'home';

  return (
    <div className={`rd-card rd-tracker-chip ${home ? 'is-home' : ''}`}>
      <span className="rd-tracker-chip__avatar">{home ? '📍' : '🛰'}</span>
      <div className="rd-tracker-chip__text">
        <span className="rd-tracker-chip__name">{name}</span>
        <span className="rd-tracker-chip__state">
          {home ? 'Zuhause' : stateLabel(tracker?.state, 'device_tracker')}
        </span>
      </div>
    </div>
  );
}

/** Input boolean as a tappable tile. */
export function InputBooleanTile({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const input = useEntity(entityId);
  const name = label ?? entityDisplayName(input, entityId);
  const on = input?.state === 'on';
  const usable = isAvailable(input);

  return (
    <button
      type="button"
      className={`rd-card rd-bool-tile ${on ? 'is-on' : ''}`}
      disabled={!usable}
      onClick={() =>
        callService('input_boolean', 'toggle', { entity_id: entityId })
      }
    >
      <span className="rd-bool-tile__name">{name}</span>
      <span className="rd-bool-tile__state">{on ? 'An' : 'Aus'}</span>
    </button>
  );
}

/** Calendar — upcoming events list. */
export function CalendarCard({
  entityId,
  label,
  daysAhead = 7,
  maxEvents = 5,
}: {
  entityId: string;
  label?: string;
  daysAhead?: number;
  maxEvents?: number;
}) {
  const calendar = useEntity(entityId);
  const name = label ?? entityDisplayName(calendar, entityId);
  const events = useCalendarEvents(entityId, daysAhead);
  const shown = events.slice(0, maxEvents);

  return (
    <div className="rd-card rd-calendar">
      <span className="rd-calendar__name">{name}</span>
      {shown.length === 0 ? (
        <p className="rd-calendar__empty">Keine Termine</p>
      ) : (
        <ul className="rd-calendar__list">
          {shown.map((ev) => (
            <li key={`${ev.summary}-${ev.start.toISOString()}`}>
              <strong>{ev.summary}</strong>
              <span>
                {ev.start.toLocaleString('de-DE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
