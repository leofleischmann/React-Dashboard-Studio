import { useEntity } from '../../../hass/hooks';
import { entityDisplayName, stateLabel } from '../../../format';

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
