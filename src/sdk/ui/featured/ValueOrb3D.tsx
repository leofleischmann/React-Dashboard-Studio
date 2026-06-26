import { useMemo, type CSSProperties } from 'react';
import { useDarkMode, useEntity } from '../../hass/hooks';
import { useTheme } from '../../hass/theme';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num, power, stateNumber } from '../../format';
import './ValueOrb3D.css';

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

export type ValueOrb3DColors = {
  /** Main lava tone (default warm orange). */
  core?: string;
  mid?: string;
  deep?: string;
  hot?: string;
  bloom?: string;
  /** Outer canvas glow; intensity still modulates opacity via CSS. */
  glow?: string;
};

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
  /**
   * Primary lava / glow color — e.g. `#3b82f6` (energy) or `#e63a12` (heat).
   * Tints the inner gradient when `colors` is omitted.
   */
  color?: string;
  /** Fine-grained gradient stops (override parts of `color`). */
  colors?: ValueOrb3DColors;
  /** Footer reading color (default: HA theme primary, then `color`). */
  accent?: string;
  /** Canvas height preset (default `default`). */
  size?: 'compact' | 'default' | 'large';
};

function formatReading(entity: HassEntity | undefined): string {
  if (!entity) return '—';
  const v = Number.parseFloat(entity.state);
  if (Number.isNaN(v)) return entity.state;
  if (entity.attributes.device_class === 'power') return power(v);
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  return unit ? `${num(v, 1)} ${unit}` : num(v, 1);
}

/** Inner lava sphere diameter relative to the glass shell (0.26 … 0.94). */
function lavaScale(intensity: number): number {
  return 0.26 + intensity * 0.68;
}

/**
 * Glass orb with a lava core — entity value controls how large the inner sphere grows.
 * Pure CSS (no WebGL).
 */
export function ValueOrb3D({
  entityId,
  min = 0,
  max = 100,
  curve = 'sqrt',
  showLevel = true,
  color,
  colors,
  accent,
  size = 'default',
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
  const innerScale = lavaScale(intensity);

  const lavaCore = colors?.core ?? color;
  const style = {
    ...(lavaCore ? { '--vorb-lava-core': lavaCore } : {}),
    ...(colors?.mid ? { '--vorb-lava-mid': colors.mid } : {}),
    ...(colors?.deep ? { '--vorb-lava-deep': colors.deep } : {}),
    ...(colors?.hot ? { '--vorb-lava-hot': colors.hot } : {}),
    ...(colors?.bloom ? { '--vorb-lava-bloom': colors.bloom } : {}),
    ...(colors?.glow ? { '--vorb-lava-glow': colors.glow } : {}),
    '--vorb-accent': accent ?? color ?? theme.primary,
    '--vorb-intensity': String(intensity),
    '--vorb-lava-scale': String(innerScale),
  } as CSSProperties;

  const reading = formatReading(entity);
  const title = showLevel ? `${reading} — ${level}` : reading;

  const sizeClass =
    size === 'compact'
      ? ' rd-value-orb--compact'
      : size === 'large'
        ? ' rd-value-orb--large'
        : '';

  return (
    <div
      className={`rd-value-orb${dark ? ' rd-value-orb--dark' : ''}${sizeClass}`}
      style={style}
    >
      <div className="rd-value-orb__canvas" title={title}>
        <div className="rd-value-orb__glow" aria-hidden />
        <div className="rd-value-orb__stage">
          <div className="rd-value-orb__glass" aria-hidden>
            <div className="rd-value-orb__lava">
              <span className="rd-value-orb__lava-hot" />
              <span className="rd-value-orb__lava-bloom" />
            </div>
            <span className="rd-value-orb__glass-shine" />
            <span className="rd-value-orb__glass-rim" />
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
