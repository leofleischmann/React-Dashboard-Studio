import { useEntity } from '../../../hass/hooks';
import { batteryColor, stateNumber } from '../../../format';

/** A single battery row with a colored bar. */
export function BatteryRow({ name, entityId }: { name: string; entityId: string }) {
  const battery = useEntity(entityId);
  const pct = stateNumber(battery);
  return (
    <div className="rd-batt">
      <span className="rd-batt__name">{name}</span>
      <div className="rd-batt__track">
        <div
          className="rd-batt__fill"
          style={{ width: `${pct ?? 0}%`, background: batteryColor(pct) }}
        />
      </div>
      <span className="rd-batt__val">{pct === undefined ? '–' : `${pct} %`}</span>
    </div>
  );
}
