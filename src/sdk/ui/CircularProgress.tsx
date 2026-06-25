import { pct } from '../format';

export type CircularProgressProps = {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Short caption under the ring (device name etc.). */
  label?: string;
  /** Center text (defaults to percentage). */
  caption?: string;
  className?: string;
};

/** SVG progress ring — battery, timer, media position, day progress, … */
export function CircularProgress({
  value,
  max = 100,
  size = 96,
  thickness = 9,
  color = 'var(--rd-accent)',
  trackColor = 'color-mix(in srgb, var(--rd-text-2) 18%, transparent)',
  label,
  caption,
  className = '',
}: CircularProgressProps) {
  const span = max > 0 ? max : 1;
  const ratio = Math.min(1, Math.max(0, value / span));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = ratio * circumference;
  const center = size / 2;
  const display = caption ?? pct(ratio * 100);

  return (
    <div className={`rd-circular-stack ${className}`.trim()}>
      <div
        className="rd-circular"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={thickness}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${center} ${center})`}
            className="rd-circular__arc"
          />
        </svg>
        <span className="rd-circular__caption">{display}</span>
      </div>
      {label ? <span className="rd-circular__label">{label}</span> : null}
    </div>
  );
}
