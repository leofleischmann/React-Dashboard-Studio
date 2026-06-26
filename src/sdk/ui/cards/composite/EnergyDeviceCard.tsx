import { useMemo } from 'react';
import {
  useEnergy,
  useEntity,
  useEntityActions,
} from '../../../hass/hooks';
import { energy, pct, power, stateNumber } from '../../../format';
import { SparkChart } from '../../charts';

/** Extended device card: live power, today/week kWh, optional week chart. */
export function EnergyDeviceCard({
  name,
  energyId,
  powerId,
  switchId,
  batteryId,
  maxPowerW = 150,
  showWeekChart = true,
}: {
  name: string;
  /** Cumulative kWh sensor (device_class energy). */
  energyId: string;
  /** Live power sensor in watts (optional). */
  powerId?: string;
  switchId?: string;
  batteryId?: string;
  maxPowerW?: number;
  showWeekChart?: boolean;
}) {
  const energyEntity = useEntity(energyId);
  const powerEntity = useEntity(powerId ?? '');
  const sw = useEntityActions(switchId ?? '');
  const battery = useEntity(batteryId ?? '');

  const today = useEnergy(energyId, { period: 'today' });
  const week = useEnergy(energyId, { period: 'week' });

  const watts = powerId ? (stateNumber(powerEntity) ?? 0) : 0;
  const on = sw.isOn;
  const barPct = powerId ? Math.min(100, (watts / maxPowerW) * 100) : 0;
  const batteryPct = batteryId ? stateNumber(battery) : undefined;

  const chartSeries = useMemo(
    () => [
      {
        points: week.daily,
        color: 'var(--rd-accent)',
        label: 'kWh/Tag',
      },
    ],
    [week.daily],
  );

  const chartLoading = week.loading && week.daily.length === 0;

  return (
    <div className="rd-card rd-device rd-energy-device">
      <div className="rd-device__head">
        <span className="rd-device__name">{name}</span>
        {switchId && (
          <button
            className={`rd-switch ${on ? 'is-on' : ''}`}
            disabled={!sw.isAvailable}
            onClick={() => sw.toggle()}
            aria-label={`${name} schalten`}
          >
            <span className="rd-switch__knob" />
          </button>
        )}
      </div>

      {powerId && (
        <>
          <div className="rd-device__power">
            {power(powerEntity?.state)}
          </div>
          <div className="rd-bar">
            <div className="rd-bar__fill" style={{ width: `${barPct}%` }} />
          </div>
        </>
      )}

      <div className="rd-energy-device__stats">
        <div className="rd-energy-device__stat">
          <span>Heute</span>
          <strong>{today.loading ? '…' : energy(today.kwh)}</strong>
        </div>
        <div className="rd-energy-device__stat">
          <span>7 Tage</span>
          <strong>{week.loading ? '…' : energy(week.kwh)}</strong>
        </div>
        {batteryId && batteryPct !== undefined && (
          <div className="rd-energy-device__stat">
            <span>Batterie</span>
            <strong>{pct(batteryPct)}</strong>
          </div>
        )}
      </div>

      {showWeekChart && (
        <div className="rd-energy-device__chart">
          <SparkChart
            series={chartSeries}
            height={72}
            strokeWidth={2}
            showLegend={false}
            loading={chartLoading}
            emptyLabel="Keine Verbrauchsdaten"
            loadingLabel="Lade Verlauf…"
            axes={{ yLabel: 'kWh', showTicks: false }}
          />
        </div>
      )}

      <div className="rd-device__foot">
        <span>Zählerstand {energy(energyEntity?.state)}</span>
      </div>
    </div>
  );
}
