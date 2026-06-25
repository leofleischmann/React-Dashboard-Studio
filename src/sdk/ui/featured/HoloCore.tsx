import { useEffect, useMemo, type CSSProperties } from 'react';
import { useEntity } from '../../hass/hooks';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num, power } from '../../format';

function intensityFromEntity(entity: HassEntity | undefined): number {
  if (!entity) return 0.38;
  const v = Number.parseFloat(entity.state);
  if (Number.isNaN(v) || v < 0) return 0.15;

  const dc = entity.attributes.device_class as string | undefined;
  if (dc === 'power') return Math.min(1, Math.max(0.06, v / 4500));
  if (dc === 'current') return Math.min(1, Math.max(0.08, v / 32));
  if (dc === 'voltage') return Math.min(1, Math.max(0.1, (v - 200) / 50));

  const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
  if (unit === 'w' || unit === 'kw') {
    const watts = unit === 'kw' ? v * 1000 : v;
    return Math.min(1, Math.max(0.06, watts / 4500));
  }

  return Math.min(1, Math.max(0.1, v / 100));
}

function formatReading(entity: HassEntity | undefined): string {
  if (!entity) return '—';
  const v = Number.parseFloat(entity.state);
  if (Number.isNaN(v)) return entity.state;
  const dc = entity.attributes.device_class as string | undefined;
  if (dc === 'power') return power(v);
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  return unit ? `${num(v, 1)} ${unit}` : num(v, 1);
}

/**
 * CSS 3D holo reactor — rings + plasma core driven by a power (or numeric) sensor.
 */
export function HoloCore({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const intensity = useMemo(() => intensityFromEntity(entity), [entity]);
  const label = entityDisplayName(entity, entityId);

  useEffect(() => {
    console.log('[Debug HoloCore]:', {
      entityId,
      state: entity?.state,
      intensity: intensity.toFixed(2),
    });
  }, [entityId, entity?.state, intensity]);

  const style = {
    '--hc-i': String(intensity),
    '--hc-speed': String(1.1 + intensity * 2.4),
  } as CSSProperties;

  return (
    <div className="rd-holocore" style={style}>
      <div className="rd-holocore__stage" aria-hidden>
        <div className="rd-holocore__grid" />
        <div className="rd-holocore__scan" />
        <div className="rd-holocore__scene">
          <div className="rd-holocore__orbit rd-holocore__orbit--a">
            <div className="rd-holocore__ring" />
          </div>
          <div className="rd-holocore__orbit rd-holocore__orbit--b">
            <div className="rd-holocore__ring" />
          </div>
          <div className="rd-holocore__orbit rd-holocore__orbit--c">
            <div className="rd-holocore__ring rd-holocore__ring--dashed" />
          </div>
          <div className="rd-holocore__shell" />
          <div className="rd-holocore__core" />
          <div className="rd-holocore__flare" />
        </div>
        <div className="rd-holocore__floor" />
      </div>

      <div className="rd-holocore__readout">
        <strong>{formatReading(entity)}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
