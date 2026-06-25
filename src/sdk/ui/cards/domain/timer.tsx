import { callService, useEntity } from '../../../hass/hooks';
import { duration, entityDisplayName, isAvailable, num, stateColor, stateLabel } from '../../../format';

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
