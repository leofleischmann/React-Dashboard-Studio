import { useEffect, useMemo, type CSSProperties } from 'react';
import { useDarkMode, useEntity } from '../../hass/hooks';
import { useTheme } from '../../hass/theme';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num, power, stateNumber } from '../../format';
import './ValueOrb3D.css';

const MERIDIAN_ANGLES = [0, 36, 72, 108, 144] as const;

export type OrbCurve = 'linear' | 'sqrt';

/** Map a numeric reading to orb intensity 0…1 (with a small floor for visibility). */
export function mapToIntensity(
  value: number | undefined,
  min: number,
  max: number,
  curve: OrbCurve = 'sqrt',
): number {
  if (value === undefined || Number.isNaN(value)) return 0.1;
  const span = max - min;
  if (span <= 0) return 0.1;
  const t = Math.min(1, Math.max(0, (value - min) / span));
  const curved = curve === 'sqrt' ? Math.sqrt(t) : t;
  return Math.max(0.06, curved);
}

function intensityFromEntity(
  entity: HassEntity | undefined,
  min: number,
  max: number,
  curve: OrbCurve,
): number {
  return mapToIntensity(stateNumber(entity), min, max, curve);
}

export function intensityLevelLabel(intensity: number): string {
  if (intensity < 0.22) return 'Niedrig';
  if (intensity < 0.48) return 'Mittel';
  if (intensity < 0.72) return 'Hoch';
  return 'Sehr hoch';
}

/**
 * Heuristic min/max for gallery demos — always set explicit min/max in your dashboard code.
 */
export function suggestOrbRange(entity?: HassEntity): { min: number; max: number } {
  if (!entity) return { min: 0, max: 100 };

  const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
  const dc = entity.attributes.device_class as string | undefined;

  if (dc === 'power' || unit === 'w' || unit === 'kw') {
    return { min: 0, max: 4500 };
  }
  if (unit === '%') {
    return { min: 0, max: 100 };
  }

  const attrMin = entity.attributes.min;
  const attrMax = entity.attributes.max;
  if (typeof attrMin === 'number' && typeof attrMax === 'number' && attrMax > attrMin) {
    return { min: attrMin, max: attrMax };
  }

  const v = stateNumber(entity);
  if (v !== undefined) {
    const ceiling = Math.max(100, Math.abs(v) * 1.5);
    return { min: 0, max: ceiling };
  }

  return { min: 0, max: 100 };
}

export type ValueOrb3DProps = {
  entityId: string;
  /** Lower bound of the value range mapped to the orb (default 0). */
  min?: number;
  /** Upper bound of the value range mapped to the orb (default 100). */
  max?: number;
  /** `sqrt` eases mid-range; `linear` is a straight mapping. */
  curve?: OrbCurve;
  /** Show intensity tier under the reading (default true). */
  showLevel?: boolean;
};

function formatReading(entity: HassEntity | undefined): string {
  if (!entity) return '—';
  const v = Number.parseFloat(entity.state);
  if (Number.isNaN(v)) return entity.state;
  if (entity.attributes.device_class === 'power') return power(v);
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  return unit ? `${num(v, 1)} ${unit}` : num(v, 1);
}

function OrbShell({ variant }: { variant: 'outer' | 'inner' }) {
  return (
    <div className={`rd-value-orb__shell rd-value-orb__shell--${variant}`} aria-hidden>
      {MERIDIAN_ANGLES.map((deg) => (
        <span
          key={`m-${variant}-${deg}`}
          className="rd-value-orb__ring"
          style={{ transform: `rotateY(${deg}deg) rotateX(90deg)` }}
        />
      ))}
      <span className="rd-value-orb__ring rd-value-orb__ring--equator" />
      <span className="rd-value-orb__ring" style={{ transform: 'rotateX(90deg)' }} />
      <span className="rd-value-orb__ring" style={{ transform: 'rotateZ(90deg) rotateX(90deg)' }} />
    </div>
  );
}

/**
 * Calm wireframe-style orb — any numeric entity state mapped to 0…1 via min/max.
 * Pure CSS 3D (no WebGL).
 */
export function ValueOrb3D({
  entityId,
  min = 0,
  max = 100,
  curve = 'sqrt',
  showLevel = true,
}: ValueOrb3DProps) {
  const entity = useEntity(entityId);
  const dark = useDarkMode();
  const theme = useTheme();

  const intensity = useMemo(
    () => intensityFromEntity(entity, min, max, curve),
    [entity, min, max, curve],
  );
  const label = entityDisplayName(entity, entityId);
  const level = intensityLevelLabel(intensity);
  const rawValue = stateNumber(entity);
  const baseScale = 0.94 + intensity * 0.14;

  useEffect(() => {
    console.log('[Debug ValueOrb3D]:', {
      entityId,
      raw: rawValue,
      min,
      max,
      curve,
      intensity: intensity.toFixed(2),
      level,
      renderer: 'css-3d',
    });
  }, [entityId, rawValue, min, max, curve, intensity, level]);

  const style = {
    '--vorb-accent': theme.primary,
    '--vorb-pulse': String(0.2 + intensity * 0.5),
    '--vorb-intensity': String(intensity),
    '--vorb-base-scale': String(baseScale),
  } as CSSProperties;

  const reading = formatReading(entity);
  const title = showLevel ? `${reading} — ${level}` : reading;

  return (
    <div className={`rd-value-orb${dark ? ' rd-value-orb--dark' : ''}`} style={style}>
      <div className="rd-value-orb__canvas" title={title}>
        <div className="rd-value-orb__stage">
          <div className="rd-value-orb__orb">
            <OrbShell variant="outer" />
            <OrbShell variant="inner" />
          </div>
        </div>
      </div>
      <div className="rd-value-orb__footer">
        <strong>{reading}</strong>
        {showLevel && <span className="rd-value-orb__level">{level}</span>}
        <small>{label}</small>
      </div>
    </div>
  );
}
