import { useEntity, useEntityActions } from '../../../hass/hooks';
import {
  defaultEntityService,
  entityDomain,
  TOGGLE_DOMAINS,
} from '../../../entityActions';
import { num, stateNumber } from '../../../format';

export function EntityRow({
  entityId,
  label,
  toggle = 'auto',
}: {
  entityId: string;
  label?: string;
  toggle?: boolean | 'auto';
}) {
  const actions = useEntityActions(entityId);
  const entity = actions.entity;
  const domain = entityDomain(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const unit = entity?.attributes.unit_of_measurement;
  const showToggle =
    toggle === 'auto' ? TOGGLE_DOMAINS.has(domain) : toggle;

  return (
    <div className="rd-card rd-entity-row">
      <div className="rd-entity-row__main">
        <span className="rd-entity-row__name">{name}</span>
        <span className="rd-entity-row__id">{entityId}</span>
      </div>
      <div className="rd-entity-row__side">
        <span className="rd-entity-row__state">
          {entity?.state ?? '–'}
          {unit ? ` ${unit}` : ''}
        </span>
        {showToggle && (
          <button
            className={`rd-switch ${actions.isOn ? 'is-on' : ''}`}
            disabled={!actions.isAvailable}
            aria-label={`${name} schalten`}
            onClick={() => actions.press()}
          >
            <span className="rd-switch__knob" />
          </button>
        )}
      </div>
    </div>
  );
}

export type GaugeThreshold = { value: number; color: string };

export type GaugeProps = {
  entityId: string;
  label?: string;
  min?: number;
  max?: number;
  unit?: string;
  /** Ease fill width: `sqrt` spreads low values (default `linear`). */
  curve?: 'linear' | 'sqrt';
  /** Default bar fill when no threshold matches. */
  color?: string;
  /** Color steps by absolute value (ascending `value`). */
  thresholds?: GaugeThreshold[];
};

export function Gauge({
  entityId,
  label,
  min = 0,
  max = 100,
  unit,
  curve = 'linear',
  color,
  thresholds,
}: GaugeProps) {
  const entity = useEntity(entityId);
  const value = stateNumber(entity);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const u = unit ?? (entity?.attributes.unit_of_measurement as string | undefined);
  const span = max - min || 1;
  const rawT = value === undefined ? 0 : Math.min(1, Math.max(0, (value - min) / span));
  const t = curve === 'sqrt' ? Math.sqrt(rawT) : rawT;
  const pct = t * 100;

  let fillColor = color;
  if (value !== undefined && thresholds?.length) {
    const sorted = [...thresholds].sort((a, b) => a.value - b.value);
    for (const th of sorted) {
      if (value >= th.value) fillColor = th.color;
    }
  }

  return (
    <div className="rd-card rd-gauge">
      <div className="rd-gauge__head">
        <span className="rd-gauge__name">{name}</span>
        <span className="rd-gauge__value">
          {num(entity?.state)}
          {u && <small> {u}</small>}
        </span>
      </div>
      <div className="rd-bar">
        <div
          className="rd-bar__fill"
          style={{
            width: `${pct}%`,
            ...(fillColor ? { background: fillColor } : {}),
          }}
        />
      </div>
    </div>
  );
}

export function ActionButton({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const actions = useEntityActions(entityId);
  const entity = actions.entity;
  const domain = entityDomain(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const service = defaultEntityService(entityId);

  return (
    <button
      className="rd-card rd-action-btn"
      disabled={!actions.isAvailable}
      onClick={() => actions.press()}
    >
      <span className="rd-action-btn__name">{name}</span>
      <span className="rd-action-btn__hint">{domain}.{service}</span>
    </button>
  );
}

export function BinaryBadge({
  entityId,
  label,
  onLabel = 'an',
  offLabel = 'aus',
}: {
  entityId: string;
  label?: string;
  onLabel?: string;
  offLabel?: string;
}) {
  const entity = useEntity(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const on = entity?.state === 'on';

  return (
    <div className={`rd-card rd-binary ${on ? 'is-on' : ''}`}>
      <span className="rd-binary__dot" />
      <div className="rd-binary__text">
        <span className="rd-binary__name">{name}</span>
        <span className="rd-binary__state">{on ? onLabel : offLabel}</span>
      </div>
    </div>
  );
}
