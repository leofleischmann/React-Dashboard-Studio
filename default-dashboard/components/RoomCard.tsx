import type { CSSProperties } from 'react';
import { callServiceWithTarget, useAreaEntities, type AreaEntry } from '@ha';
import { num, stateLabel } from '@ha/format';

const isNum = (s?: string) =>
  s !== undefined && s !== '' && !Number.isNaN(Number.parseFloat(s));

const MOTION_CLASSES = new Set(['motion', 'occupancy', 'presence']);

/**
 * Live room tile built from a Home Assistant **area** — pulls every entity in the
 * area via `useAreaEntities` and distils it to temperature, humidity, light count
 * and occupancy. One tap toggles the whole room's lights. Returns `null` for empty
 * areas so the grid only ever shows rooms that actually have something to show.
 */
export function RoomCard({ area, accent }: { area: AreaEntry; accent: string }) {
  const entities = useAreaEntities(area.area_id);

  const temp = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      e.attributes.device_class === 'temperature' &&
      isNum(e.state),
  );
  const hum = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      e.attributes.device_class === 'humidity' &&
      isNum(e.state),
  );
  const climate = entities.find((e) => e.entity_id.startsWith('climate.'));
  const lights = entities.filter((e) => e.entity_id.startsWith('light.'));
  const lightsOn = lights.filter((l) => l.state === 'on');
  const motion = entities.find(
    (e) =>
      e.entity_id.startsWith('binary_sensor.') &&
      MOTION_CLASSES.has(String(e.attributes.device_class)),
  );

  const hasLights = lights.length > 0;
  if (!temp && !hum && !climate && !hasLights && !motion) return null;

  const lit = lightsOn.length > 0;
  const occupied = motion?.state === 'on';
  const lightIds = lights.map((l) => l.entity_id);
  const tempVal = temp
    ? num(temp.state)
    : climate
      ? num(climate.attributes.current_temperature as number)
      : undefined;

  const style = { '--tone': accent } as CSSProperties;

  return (
    <div
      className={`rd-room2 ${lit ? 'is-lit' : ''} ${occupied ? 'is-occ' : ''}`}
      style={style}
    >
      <span className="rd-room2__glow" aria-hidden />
      <div className="rd-room2__head">
        <span className="rd-room2__name">{area.name}</span>
        {motion && (
          <span className={`rd-room2__occ ${occupied ? 'is-on' : ''}`}>
            <i />
            {occupied ? 'belegt' : 'frei'}
          </span>
        )}
      </div>

      {tempVal !== undefined ? (
        <div className="rd-room2__temp">
          {tempVal}
          <small>°</small>
        </div>
      ) : (
        <div className="rd-room2__temp rd-room2__temp--alt">
          {lightsOn.length}
          <small>/{lights.length} an</small>
        </div>
      )}

      <div className="rd-room2__metrics">
        {hum && <span>💧 {num(hum.state, 0)}%</span>}
        {tempVal !== undefined && hasLights && (
          <span>💡 {lightsOn.length}/{lights.length}</span>
        )}
        {climate && <span>🎯 {num(climate.attributes.temperature as number)}°</span>}
        {!hum && !climate && tempVal === undefined && motion && (
          <span>{stateLabel(motion.state, 'binary_sensor')}</span>
        )}
      </div>

      {hasLights && (
        <button
          type="button"
          className={`rd-room2__btn ${lit ? 'is-on' : ''}`}
          onClick={() =>
            callServiceWithTarget(
              'light',
              lit ? 'turn_off' : 'turn_on',
              {},
              { entity_id: lightIds },
            )
          }
        >
          {lit ? `${lightsOn.length} an · ausschalten` : 'Licht einschalten'}
        </button>
      )}
    </div>
  );
}
