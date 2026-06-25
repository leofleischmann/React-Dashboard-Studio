import { useMemo } from 'react';
import { useEntity, useEntityHistory, useEntityHistoryPending } from '../../hass/hooks';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num, pct, stateNumber, batteryColor } from '../../format';
import { CameraTile } from '../cards/domain';
import { ValueOrb3D, suggestOrbRange } from '../featured/ValueOrb3D';
import { LiveClock } from '../featured/LiveClock';
import { WeatherForecastRow } from '../featured/WeatherForecastRow';
import { Minitimeline } from '../featured/Minitimeline';
import { SparkChart } from '../charts';
import { CircularProgress } from '../CircularProgress';
import { Stat } from '../primitives';

/** First sensor with a parseable numeric state — for SparkChart demos. */
export function pickNumericSensorEntity(
  entities: readonly HassEntity[],
): string | undefined {
  const numeric = entities.filter(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      !Number.isNaN(Number.parseFloat(e.state)) &&
      e.state !== 'unavailable' &&
      e.state !== 'unknown',
  );
  const temp = numeric.filter((e) => e.attributes.device_class === 'temperature');
  return (temp[0] ?? numeric[0])?.entity_id;
}

export function StatDemo({ entityId }: { entityId: string }) {
  const e = useEntity(entityId);
  return (
    <Stat
      label={entityDisplayName(e, entityId)}
      value={num(e?.state)}
      unit={e?.attributes.unit_of_measurement as string | undefined}
    />
  );
}

export function SparkDemo({ entityId }: { entityId: string }) {
  const history = useEntityHistory([entityId], { hours: 24 });
  const loading = useEntityHistoryPending([entityId], { hours: 24 });
  const entity = useEntity(entityId);
  const unit = entity?.attributes.unit_of_measurement as string | undefined;

  return (
    <div className="rd-chart-preview">
      <SparkChart
        loading={loading}
        height={72}
        showLegend={false}
        emptyLabel="Kein numerischer Verlauf für diese Entity"
        series={[
          {
            label: entityDisplayName(entity, entityId),
            color: '#6ea8fe',
            points: history[entityId] ?? [],
          },
        ]}
        axes={{
          showTicks: false,
          yLabel: unit,
        }}
      />
    </div>
  );
}

export function CameraDemo({ entityId }: { entityId: string }) {
  return <CameraTile entityId={entityId} refreshSec={30} />;
}

export function LiveClockDemo(_props: { entityId: string }) {
  return <LiveClock />;
}

export function ValueOrb3DDemo({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const { min, max } = useMemo(() => suggestOrbRange(entity), [entity]);
  return <ValueOrb3D entityId={entityId} min={min} max={max} />;
}

export function WeatherForecastRowDemo({ entityId }: { entityId: string }) {
  return <WeatherForecastRow entityId={entityId} days={5} />;
}

export function MinitimelineDemo({ entityId }: { entityId: string }) {
  return <Minitimeline entityId={entityId} limit={5} hours={24} />;
}

function pickBatteryEntity(entities: readonly HassEntity[]): string | undefined {
  return entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      e.attributes.device_class === 'battery',
  )?.entity_id;
}

export function CircularProgressDemo({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const value = stateNumber(entity) ?? 0;
  const isBattery = entity?.attributes.device_class === 'battery';
  const shortLabel = isBattery
    ? undefined
    : (entity?.attributes.friendly_name as string | undefined)?.split(' ')[0];

  return (
    <CircularProgress
      value={value}
      max={100}
      size={76}
      thickness={8}
      label={shortLabel}
      caption={pct(value)}
      color={isBattery ? batteryColor(value) : 'var(--rd-accent)'}
    />
  );
}

export { pickBatteryEntity };
