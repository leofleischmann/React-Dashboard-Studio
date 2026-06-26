import { useId, useMemo, type CSSProperties } from 'react';
import { useSun, useTime } from '../../hass/hooks';
import { num } from '../../format';
import './SunArc.css';

type SkyTone = 'day' | 'twilight' | 'night';

export type SunArcProps = {
  entityId?: string;
  /** Show stars during night (default true). */
  showStars?: boolean;
  /** Show moon disc when sun is below horizon (default true). */
  showMoon?: boolean;
  /** Northern vs. southern hemisphere — flips the arc vertically (default `north`). */
  hemisphere?: 'north' | 'south';
  /** BCP 47 locale for time labels (default `de-DE`). */
  locale?: string;
  /** Custom footer labels for rise / peak / set. */
  labels?: {
    rise?: string;
    set?: string;
    elevationDay?: string;
    elevationNight?: string;
  };
  /** Show “remaining daylight” / “next sunrise” hint (default true). */
  showRemaining?: boolean;
  /** `compact` scales down the arc for tight layouts. */
  size?: 'compact' | 'default';
  /** Highlight the portion of the arc already travelled (default true). */
  showProgress?: boolean;
  /** Master switch for the whole data row below the arc (default true). */
  showLabels?: boolean;
  /** Show the sunrise read-out in the data row (default true). */
  showRise?: boolean;
  /** Show the sunset read-out in the data row (default true). */
  showSet?: boolean;
  /** Show the central elevation read-out (default true). */
  showElevation?: boolean;
  /** Master switch for subtle motion — twinkle, ray spin, glides (default true). */
  animated?: boolean;
  /** Override the accent colour used for the arc/progress (any CSS colour). */
  accentColor?: string;
};

function moonPhase(date: Date): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.530588853 * 86_400_000;
  return (((date.getTime() - ref) % synodic) + synodic) % synodic / synodic;
}

function formatSunEvent(date: Date | undefined, now: Date, locale: string): string {
  if (!date) return '—';
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() !== now.toDateString()) return `morgen ${time}`;
  return time;
}

function formatDaylightRemaining(ms: number): string | null {
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `noch ${h}h ${m}min Tageslicht`;
  return `noch ${m} min Tageslicht`;
}

function skyTone(elevation: number | undefined, isDay: boolean): SkyTone {
  const elev = elevation ?? 0;
  if (!isDay || elev < -4) return 'night';
  if (elev < 6) return 'twilight';
  return 'day';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

const MS_PER_DAY = 86_400_000;

type ArcWindow = { start: Date; end: Date };

/**
 * Today's daylight window (sunrise → sunset) from HA `next_*` attributes.
 * While the sun is up, `next_rising` is tomorrow and `next_setting` is this evening.
 */
function daylightWindow(
  now: Date,
  rising: Date | undefined,
  setting: Date | undefined,
  isDay: boolean,
): ArcWindow | null {
  if (!isDay || !rising || !setting) return null;

  const nowMs = now.getTime();
  let riseMs = rising.getTime();
  let setMs = setting.getTime();

  if (riseMs > nowMs) riseMs -= MS_PER_DAY;
  if (setMs < nowMs) setMs += MS_PER_DAY;
  if (setMs <= riseMs) return null;

  return { start: new Date(riseMs), end: new Date(setMs) };
}

/**
 * Tonight's window (last sunset → next sunrise). After sunset HA reports both
 * `next_rising` and `next_setting` in the future, with the rising first; the
 * sunset that began this night is therefore one period before `next_setting`.
 */
function nightWindow(
  now: Date,
  rising: Date | undefined,
  setting: Date | undefined,
  isDay: boolean,
): ArcWindow | null {
  if (isDay || !rising || !setting) return null;

  const nowMs = now.getTime();
  const riseMs = rising.getTime();
  let setMs = setting.getTime();

  // Walk the setting back to the most recent one before now (start of this night).
  while (setMs > nowMs) setMs -= MS_PER_DAY;
  if (riseMs <= setMs) return null;

  return { start: new Date(setMs), end: new Date(riseMs) };
}

/**
 * 0 = rise (east/left), 0.5 ≈ peak, 1 = set (west/right) — driven by time within
 * the active daylight or night window, with azimuth as a last-resort fallback.
 */
function arcProgress(
  now: Date,
  rising: Date | undefined,
  setting: Date | undefined,
  isDay: boolean,
  azimuth: number,
): number {
  const window = isDay
    ? daylightWindow(now, rising, setting, isDay)
    : nightWindow(now, rising, setting, isDay);
  if (window) {
    const span = window.end.getTime() - window.start.getTime();
    if (span > 0) {
      return clamp01((now.getTime() - window.start.getTime()) / span);
    }
  }
  return clamp01((azimuth - 90) / 180);
}

function isGoldenHour(elevation: number | undefined, isDay: boolean): boolean {
  if (!isDay) return false;
  const elev = elevation ?? 0;
  return elev >= 0 && elev <= 14;
}

const STARS: ReadonlyArray<readonly [number, number, number]> = [
  [0.12, 0.22, 1.2],
  [0.28, 0.14, 0.9],
  [0.44, 0.26, 1.1],
  [0.58, 0.12, 0.8],
  [0.72, 0.2, 1],
  [0.86, 0.16, 0.7],
  [0.2, 0.34, 0.8],
  [0.65, 0.32, 0.9],
  [0.38, 0.08, 0.6],
  [0.92, 0.28, 0.7],
];

/**
 * Geometrically faithful moon phase: a dark disc with the lit portion drawn as
 * a limb semicircle joined to the terminator (a semi-ellipse whose width tracks
 * the illuminated fraction). `phase` runs 0 (new) → 0.5 (full) → 1 (new again).
 */
function MoonDisc({ phase, r, flip = false }: { phase: number; r: number; flip?: boolean }) {
  const angle = 2 * Math.PI * phase;
  const cos = Math.cos(angle);
  const rx = r * Math.abs(cos); // terminator half-width: r at new/full, 0 at quarters
  // Northern hemisphere is lit on the right while waxing; southern is mirrored.
  const waxing = flip ? phase >= 0.5 : phase < 0.5;
  const gibbous = cos < 0; // illuminated fraction > 0.5

  const limbSweep = waxing ? 1 : 0;
  const termSweep = gibbous ? limbSweep : 1 - limbSweep;

  const lit = `M 0 ${-r} A ${r} ${r} 0 0 ${limbSweep} 0 ${r} A ${rx} ${r} 0 0 ${termSweep} 0 ${-r} Z`;

  return (
    <g className="rd-sunarc__moon">
      <circle r={r} className="rd-sunarc__moon-shadow" />
      <path d={lit} className="rd-sunarc__moon-body" />
      <circle r={r} className="rd-sunarc__moon-rim" />
    </g>
  );
}

/**
 * Sun path arc for `sun.sun` — position along the track follows daylight progress
 * (sunrise → sunset), not azimuth; elevation drives sky tone and labels.
 */
export function SunArc({
  entityId = 'sun.sun',
  showStars = true,
  showMoon = true,
  hemisphere = 'north',
  locale = 'de-DE',
  labels,
  showRemaining = true,
  size = 'default',
  showProgress = true,
  showLabels = true,
  showRise = true,
  showSet = true,
  showElevation = true,
  animated = true,
  accentColor,
}: SunArcProps) {
  const sun = useSun(entityId);
  const now = useTime(60_000);
  const uid = useId().replace(/:/g, '');

  const riseLabel = labels?.rise ?? 'Aufgang';
  const setLabel = labels?.set ?? 'Untergang';
  const elevDayLabel = labels?.elevationDay ?? 'Sonnenstand';
  const elevNightLabel = labels?.elevationNight ?? 'unter Horizont';

  const W = 280;
  const H = 150;
  const pad = 22;
  // Headroom at the peak so the celestial body + its glow never clip at the top.
  const peakPad = 26;
  const cx = W / 2;
  const cy = H - 28;
  const rx = (W - pad * 2) / 2;
  const ry = cy - peakPad;

  const isDay = sun.isDay ?? true;
  const elevation = sun.elevation ?? 0;
  const azimuth = sun.azimuth ?? 180;

  const t = useMemo(
    () => arcProgress(now, sun.rising, sun.setting, isDay, azimuth),
    [now, sun.rising, sun.setting, isDay, azimuth],
  );

  const arcSign = hemisphere === 'south' ? -1 : 1;
  const arcSweep = hemisphere === 'south' ? 0 : 1;
  const sx = cx - rx * Math.cos(Math.PI * t);
  const sy = cy - arcSign * ry * Math.sin(Math.PI * t);

  const tone = skyTone(elevation, isDay);
  const golden = isGoldenHour(elevation, isDay);
  const phase = moonPhase(now);
  const moonIllum = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  const arc = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${arcSweep} ${cx + rx} ${cy}`;
  const arcDone = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${arcSweep} ${sx} ${sy}`;

  const daylightLeft = useMemo(() => {
    if (!isDay || !sun.setting) return null;
    return formatDaylightRemaining(sun.setting.getTime() - now.getTime());
  }, [isDay, sun.setting, now]);

  const nightUntilRise = useMemo(() => {
    if (isDay || !sun.rising) return null;
    const ms = sun.rising.getTime() - now.getTime();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `Aufgang in ${h}h ${m}min`;
    return `Aufgang in ${m} min`;
  }, [isDay, sun.rising, now]);

  const footer = daylightLeft ?? nightUntilRise;
  const labelCols = [showRise, showElevation, showSet].filter(Boolean).length;

  const rootClass = [
    'rd-sunarc',
    `rd-sunarc--${tone}`,
    golden && 'rd-sunarc--golden',
    size === 'compact' && 'rd-sunarc--compact',
    !animated && 'rd-sunarc--static',
  ]
    .filter(Boolean)
    .join(' ');

  const rootStyle = accentColor
    ? ({ ['--rd-accent' as string]: accentColor } as CSSProperties)
    : undefined;

  return (
    <div className={rootClass} style={rootStyle}>
      <svg viewBox={`0 0 ${W} ${H}`} className="rd-sunarc__svg" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            {tone === 'day' && (
              <>
                <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.55" />
                <stop offset="55%" stopColor="#87ceeb" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffb86a" stopOpacity="0.2" />
              </>
            )}
            {tone === 'twilight' && (
              <>
                <stop offset="0%" stopColor="#2d3a6b" stopOpacity="0.7" />
                <stop offset="45%" stopColor="#c96a4a" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ffb347" stopOpacity="0.35" />
              </>
            )}
            {tone === 'night' && (
              <>
                <stop offset="0%" stopColor="#0a0e1f" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#141c38" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1e2848" stopOpacity="0.4" />
              </>
            )}
          </linearGradient>
          <linearGradient id={`${uid}-track`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--rd-accent)" stopOpacity="0.12" />
            <stop offset="50%" stopColor="var(--rd-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--rd-accent)" stopOpacity="0.12" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`}>
            <stop offset="0%" stopColor={isDay ? '#ffd66b' : '#e8eeff'} stopOpacity="0.95" />
            <stop offset="100%" stopColor={isDay ? '#ffd66b' : '#e8eeff'} stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-clip`}>
            <rect x="0" y="0" width={W} height={H} rx="12" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${uid}-clip)`}>
          <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-sky)`} />

          {tone === 'night' &&
            showStars &&
            STARS.map(([x, y, size], i) => (
              <circle
                key={i}
                cx={x * W}
                cy={y * H}
                r={size}
                className="rd-sunarc__star"
                style={{ animationDelay: `${(i % 5) * 0.7}s` }}
              />
            ))}

          {golden && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx * 1.05}
              ry={ry * 0.45}
              className="rd-sunarc__glow-haze"
            />
          )}

          <line x1={pad - 6} y1={cy} x2={W - pad + 6} y2={cy} className="rd-sunarc__horizon" />
          <path
            d={arc}
            fill="none"
            stroke={`url(#${uid}-track)`}
            strokeWidth="2"
            strokeDasharray="2 6"
            strokeLinecap="round"
          />
          {showProgress && (
            <path
              d={arcDone}
              fill="none"
              className="rd-sunarc__track-done"
              strokeLinecap="round"
            />
          )}

          <g className="rd-sunarc__celestial" transform={`translate(${sx} ${sy})`}>
            <circle
              r="22"
              fill={`url(#${uid}-glow)`}
              opacity={isDay ? 1 : 0.3 + 0.7 * moonIllum}
            />
            {isDay ? (
              <>
                <circle r="8" className="rd-sunarc__body is-day" />
                {elevation > 35 && (
                  <g className="rd-sunarc__rays">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <line
                        key={deg}
                        x1={0}
                        y1={-13}
                        x2={0}
                        y2={-17}
                        className="rd-sunarc__ray"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                  </g>
                )}
              </>
            ) : showMoon ? (
              <MoonDisc phase={phase} r={8} flip={hemisphere === 'south'} />
            ) : (
              <circle r={6} className="rd-sunarc__body" />
            )}
          </g>
        </g>
      </svg>

      {showLabels && labelCols > 0 && (
        <div className={`rd-sunarc__labels${labelCols === 1 ? ' rd-sunarc__labels--single' : ''}`}>
          {showRise && (
            <div>
              <span className="rd-sunarc__ico">↑</span>
              <strong>{formatSunEvent(sun.rising, now, locale)}</strong>
              <small>{riseLabel}</small>
            </div>
          )}
          {showElevation && (
            <div className="rd-sunarc__elev">
              <strong>{num(sun.elevation)}°</strong>
              <small title={`Azimut ${num(sun.azimuth)}°`}>
                {isDay ? elevDayLabel : elevNightLabel}
              </small>
            </div>
          )}
          {showSet && (
            <div>
              <span className="rd-sunarc__ico">↓</span>
              <strong>{formatSunEvent(sun.setting, now, locale)}</strong>
              <small>{setLabel}</small>
            </div>
          )}
        </div>
      )}

      {showRemaining && footer && <p className="rd-sunarc__remaining">{footer}</p>}
    </div>
  );
}
