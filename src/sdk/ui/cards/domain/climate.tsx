import { callService, useEntity } from '../../../hass/hooks';
import { entityDisplayName, isAvailable, num, pct, stateLabel, temp } from '../../../format';

export function ClimateCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const climate = useEntity(entityId);
  const name = label ?? climate?.attributes.friendly_name ?? entityId;
  const current = climate?.attributes.current_temperature;
  const target = climate?.attributes.temperature;
  const mode = climate?.attributes.hvac_mode ?? climate?.state;

  return (
    <div className="rd-card rd-climate">
      <div className="rd-climate__head">
        <span className="rd-climate__name">{name}</span>
        <span className="rd-climate__mode">{String(mode ?? '–')}</span>
      </div>
      <div className="rd-climate__temps">
        <span>
          {num(current !== undefined ? String(current) : undefined)}
          <small> °C ist</small>
        </span>
        <span className="rd-climate__target">
          → {num(target !== undefined ? String(target) : undefined)}
          <small> °C soll</small>
        </span>
      </div>
      <button
        className="rd-pill"
        disabled={!isAvailable(climate)}
        onClick={() => callService('climate', 'toggle', { entity_id: entityId })}
      >
        Klima umschalten
      </button>
    </div>
  );
}

/** Humidifier — toggle and target humidity. */
export function HumidifierCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const unit = useEntity(entityId);
  const name = label ?? entityDisplayName(unit, entityId);
  const on = unit?.state === 'on';
  const target = unit?.attributes.humidity as number | undefined;
  const current = unit?.attributes.current_humidity as number | undefined;
  const usable = isAvailable(unit);

  return (
    <div className="rd-card rd-humidifier">
      <div className="rd-humidifier__head">
        <span className="rd-humidifier__name">{name}</span>
        <button
          type="button"
          className={`rd-switch ${on ? 'is-on' : ''}`}
          disabled={!usable}
          onClick={() => callService('humidifier', 'toggle', { entity_id: entityId })}
        >
          <span className="rd-switch__knob" />
        </button>
      </div>
      <div className="rd-humidifier__metrics">
        <span>Ist: {pct(current !== undefined ? String(current) : undefined)}</span>
        <span>Soll: {pct(target !== undefined ? String(target) : undefined)}</span>
      </div>
    </div>
  );
}

/** Water heater — temperature and mode. */
export function WaterHeaterCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const heater = useEntity(entityId);
  const name = label ?? entityDisplayName(heater, entityId);
  const current = heater?.attributes.current_temperature;
  const target = heater?.attributes.temperature;
  const mode = heater?.attributes.operation_mode ?? heater?.state;
  const usable = isAvailable(heater);

  return (
    <div className="rd-card rd-water-heater">
      <span className="rd-water-heater__name">{name}</span>
      <div className="rd-water-heater__temps">
        <strong>{temp(current !== undefined ? String(current) : undefined)}</strong>
        <span>→ {temp(target !== undefined ? String(target) : undefined)}</span>
      </div>
      <span className="rd-water-heater__mode">{stateLabel(String(mode), 'water_heater')}</span>
      <button
        type="button"
        className="rd-pill"
        disabled={!usable}
        onClick={() => callService('water_heater', 'toggle', { entity_id: entityId })}
      >
        Umschalten
      </button>
    </div>
  );
}
