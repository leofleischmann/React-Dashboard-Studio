import { useEntityActions } from '../../../hass/hooks';
import { entityDisplayName } from '../../../format';

/** One-tap scene activation. */
export function SceneButton({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const actions = useEntityActions(entityId);
  const name = label ?? entityDisplayName(actions.entity, entityId);

  return (
    <button
      type="button"
      className="rd-card rd-scene-btn"
      disabled={!actions.isAvailable}
      onClick={() => actions.press()}
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
  const actions = useEntityActions(entityId);
  const name = label ?? entityDisplayName(actions.entity, entityId);

  return (
    <button
      type="button"
      className="rd-card rd-script-btn"
      disabled={!actions.isAvailable}
      onClick={() => actions.press()}
    >
      <span className="rd-script-btn__icon">📜</span>
      <span className="rd-script-btn__name">{name}</span>
    </button>
  );
}
