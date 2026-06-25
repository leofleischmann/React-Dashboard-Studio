import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable, pct, stateColor, stateLabel } from '../../../format';

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
