import { callService, useEntity, useEntityActions } from '../../../hass/hooks';
import type { CSSProperties } from 'react';
import { entityDomain } from '../../../entityActions';
import { entityDisplayName, isAvailable, stateNumber } from '../../../format';

export function InputBooleanTile({
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
      className={`rd-card rd-bool-tile ${actions.isOn ? 'is-on' : ''}`}
      disabled={!actions.isAvailable}
      onClick={() => actions.toggle()}
    >
      <span className="rd-bool-tile__name">{name}</span>
      <span className="rd-bool-tile__state">{actions.isOn ? 'An' : 'Aus'}</span>
    </button>
  );
}

/** Dropdown for `input_select` or `select.*` entities. */
export function SelectCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const entity = useEntity(entityId);
  const name = label ?? entityDisplayName(entity, entityId);
  const options = (entity?.attributes.options as string[] | undefined) ?? [];
  const domain = entityDomain(entityId);
  const usable = isAvailable(entity) && options.length > 0;

  return (
    <div className="rd-card rd-select">
      <span className="rd-select__name">{name}</span>
      <select
        className="rd-select__input"
        value={entity?.state ?? ''}
        disabled={!usable}
        onChange={(e) =>
          callService(domain, 'select_option', {
            entity_id: entityId,
            option: e.target.value,
          })
        }
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NumberSlider({
  entityId,
  label,
  min,
  max,
  step,
}: {
  entityId: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const entity = useEntity(entityId);
  const domain = entityDomain(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const usable = isAvailable(entity);

  const minVal =
    min ??
    (domain === 'light' ? 0 : (entity?.attributes.min as number | undefined) ?? 0);
  const maxVal =
    max ??
    (domain === 'light' ? 100 : (entity?.attributes.max as number | undefined) ?? 100);
  const stepVal =
    step ?? (entity?.attributes.step as number | undefined) ?? (domain === 'light' ? 1 : 1);

  let value = minVal;
  if (domain === 'light') {
    const b = entity?.attributes.brightness;
    value =
      entity?.state === 'on' && typeof b === 'number'
        ? Math.round((b / 255) * 100)
        : 0;
  } else {
    value = stateNumber(entity) ?? minVal;
  }

  const setValue = (next: number) => {
    if (domain === 'light') {
      void callService('light', 'turn_on', {
        entity_id: entityId,
        brightness_pct: next,
      });
    } else {
      void callService('input_number', 'set_value', {
        entity_id: entityId,
        value: next,
      });
    }
  };

  const pctFill =
    maxVal > minVal ? `${((value - minVal) / (maxVal - minVal)) * 100}%` : '0%';
  const unit =
    domain === 'light'
      ? '%'
      : ((entity?.attributes.unit_of_measurement as string | undefined) ?? '');

  return (
    <div className="rd-card rd-slider">
      <div className="rd-slider__head">
        <span className="rd-slider__name">{name}</span>
        <span className="rd-slider__value">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="rd-slider__track" style={{ '--rd-slider-pct': pctFill } as CSSProperties}>
        <input
          type="range"
          className="rd-slider__input"
          min={minVal}
          max={maxVal}
          step={stepVal}
          value={value}
          disabled={!usable}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
