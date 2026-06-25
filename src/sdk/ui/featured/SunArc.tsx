import { useId, useMemo } from 'react';
import { useSun, useTime } from '../../hass/hooks';
import { num } from '../../format';

type SkyTone = 'day' | 'twilight' | 'night';

function moonPhase(date: Date): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.530588853 * 86_400_000;
  return (((date.getTime() - ref) % synodic) + synodic) % synodic / synodic;
}

function formatSunEvent(date: Date | undefined, now: Date): string {
  if (!date) return '—';
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

function MoonDisc({ phase, r }: { phase: number; r: number }) {
  const illum = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
  const waxing = phase <= 0.5;
  const offset = (1 - illum) * r * 1.35 * (waxing ? 1 : -1);

  return (
    <g className="rd-sunarc__moon">
      <circle r={r} className="rd-sunarc__moon-body" />
      <circle r={r} cx={offset} className="rd-sunarc__moon-shadow" />
    </g>
  );
}

/**
 * Sun path arc for `sun.sun` — sky gradient, stars at night, moon phase,
 * azimuth for horizontal position, elevation for height.
 */
export function SunArc({ entityId = 'sun.sun' }: { entityId?: string }) {
  const sun = useSun(entityId);
  const now = useTime(60_000);
  const uid = useId().replace(/:/g, '');

  const W = 280;
  const H = 148;
  const pad = 22;
  const cx = W / 2;
  const cy = H - 28;
  const r = (W - pad * 2) / 2;

  const az = sun.azimuth ?? 180;
  const t = Math.min(1, Math.max(0, (az - 90) / 180));
  const sx = cx + r * Math.cos(Math.PI * t) * -1;

  const isDay = sun.isDay ?? true;
  const elevation = sun.elevation ?? 0;
  const tone = skyTone(elevation, isDay);
  const golden = isGoldenHour(elevation, isDay);
  const phase = moonPhase(now);

  const elevNorm = isDay
    ? Math.min(1, Math.max(0, elevation / 65))
    : 0.28 + phase * 0.12;
  const sy = cy - elevNorm * r;

  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

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

  return (
    <div className={`rd-sunarc rd-sunarc--${tone}${golden ? ' rd-sunarc--golden' : ''}`}>
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
            STARS.map(([x, y, size], i) => (
              <circle
                key={i}
                cx={x * W}
                cy={y * H}
                r={size}
                className="rd-sunarc__star"
              />
            ))}

          {golden && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={r * 1.05}
              ry={r * 0.35}
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

          <g className="rd-sunarc__celestial" transform={`translate(${sx} ${sy})`}>
            <circle r="22" fill={`url(#${uid}-glow)`} />
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
            ) : (
              <MoonDisc phase={phase} r={8} />
            )}
          </g>
        </g>
      </svg>

      <div className="rd-sunarc__labels">
        <div>
          <span className="rd-sunarc__ico">↑</span>
          <strong>{formatSunEvent(sun.rising, now)}</strong>
          <small>Aufgang</small>
        </div>
        <div className="rd-sunarc__elev">
          <strong>{num(sun.elevation)}°</strong>
          <small title={`Azimut ${num(sun.azimuth)}°`}>
            {isDay ? 'Sonnenstand' : 'unter Horizont'}
          </small>
        </div>
        <div>
          <span className="rd-sunarc__ico">↓</span>
          <strong>{formatSunEvent(sun.setting, now)}</strong>
          <small>Untergang</small>
        </div>
      </div>

      {footer && <p className="rd-sunarc__remaining">{footer}</p>}
    </div>
  );
}
