import { callService, useEntity } from '../../../hass/hooks';
import { isAvailable } from '../../../format';

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
