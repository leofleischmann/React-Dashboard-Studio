import { useEntity, useEntityActions } from '../../../hass/hooks';
import { euro, num, stateNumber } from '../../../format';

/** A power/energy card for a switchable device. */
export function DeviceCard({
  name,
  powerId,
  kwhId,
  costId,
  switchId,
}: {
  name: string;
  powerId: string;
  kwhId: string;
  costId: string;
  switchId: string;
}) {
  const power = useEntity(powerId);
  const kwh = useEntity(kwhId);
  const cost = useEntity(costId);
  const sw = useEntityActions(switchId);

  const watts = stateNumber(power) ?? 0;
  const barPct = Math.min(100, (watts / 150) * 100);

  return (
    <div className="rd-card rd-device">
      <div className="rd-device__head">
        <span className="rd-device__name">{name}</span>
        <button
          className={`rd-switch ${sw.isOn ? 'is-on' : ''}`}
          disabled={!sw.isAvailable}
          onClick={() => sw.toggle()}
          aria-label={`${name} schalten`}
        >
          <span className="rd-switch__knob" />
        </button>
      </div>

      <div className="rd-device__power">
        {num(power?.state)}
        <small> W</small>
      </div>
      <div className="rd-bar">
        <div className="rd-bar__fill" style={{ width: `${barPct}%` }} />
      </div>

      <div className="rd-device__foot">
        <span>{num(kwh?.state)} kWh / Monat</span>
        <span>{euro(cost?.state)}</span>
      </div>
    </div>
  );
}
