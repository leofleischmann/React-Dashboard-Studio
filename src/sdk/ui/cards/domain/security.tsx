import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable, stateColor, stateLabel } from '../../../format';

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
