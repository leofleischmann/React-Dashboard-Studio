import { useMemo } from 'react';
import { useEntity, useEntityHistory, useEntityHistoryPending } from '../../hass/hooks';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num } from '../../format';
import { CameraTile } from '../cards/domain';
import { ValueOrb3D, suggestOrbRange } from '../featured/ValueOrb3D';
import { LiveClock } from '../featured/LiveClock';
import { SparkChart } from '../charts';
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
  return (
    <SparkChart
      loading={loading}
      emptyLabel="Kein numerischer Verlauf für diese Entity"
      series={[
        {
          label: entityId.split('.')[1] ?? 'Verlauf',
          color: '#6ea8fe',
          points: history[entityId] ?? [],
        },
      ]}
    />
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
