import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable, pct } from '../../../format';

/** Fan — toggle and optional speed percentage. */
export function FanCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const fan = useEntity(entityId);
  const name = label ?? entityDisplayName(fan, entityId);
  const on = fan?.state === 'on';
  const speedPct = fan?.attributes.percentage as number | undefined;
  const usable = isAvailable(fan);

  return (
    <div className="rd-card rd-fan">
      <div className="rd-fan__head">
        <span className="rd-fan__name">{name}</span>
        <button
          type="button"
          className={`rd-switch ${on ? 'is-on' : ''}`}
          disabled={!usable}
          aria-label={`${name} schalten`}
          onClick={() => callService('fan', 'toggle', { entity_id: entityId })}
        >
          <span className="rd-switch__knob" />
        </button>
      </div>
      {speedPct !== undefined && (
        <div className="rd-fan__speed">
          <span>{pct(String(speedPct))}</span>
          <input
            type="range"
            className="rd-slider__input"
            min={0}
            max={100}
            step={1}
            value={on ? speedPct : 0}
            disabled={!usable}
            onChange={(e) =>
              callService('fan', 'set_percentage', {
                entity_id: entityId,
                percentage: Number(e.target.value),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
