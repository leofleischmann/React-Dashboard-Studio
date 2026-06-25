import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable, stateColor, stateLabel } from '../../../format';

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
