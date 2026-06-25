import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable, stateColor, stateLabel } from '../../../format';

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
