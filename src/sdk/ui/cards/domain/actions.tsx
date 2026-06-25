import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable } from '../../../format';

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
