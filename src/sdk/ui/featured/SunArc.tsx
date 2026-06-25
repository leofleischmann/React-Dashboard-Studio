import { useSun, useTime } from '../../hass/hooks';
import { num } from '../../format';

/**
 * Sun path arc for `sun.sun` — the sun rides a semicircle between
 * sunrise (left) and sunset (right), height from azimuth. Moon at night.
 */
export function SunArc({ entityId = 'sun.sun' }: { entityId?: string }) {
  const sun = useSun(entityId);
  useTime(60_000);

  const W = 280;
  const H = 132;
  const pad = 22;
  const cx = W / 2;
  const cy = H - 20;
  const r = (W - pad * 2) / 2;

  const az = sun.azimuth ?? 180;
  const t = Math.min(1, Math.max(0, (az - 90) / 180));
  const angle = Math.PI * t;
  const sx = cx + r * Math.cos(angle) * -1;
  const sy = cy - r * Math.sin(angle);
  const isDay = sun.isDay ?? true;

  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fmtTime = (d?: Date) =>
    d ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="rd-sunarc">
      <svg viewBox={`0 0 ${W} ${H}`} className="rd-sunarc__svg" aria-hidden>
        <defs>
          <linearGradient id="rd-sun-track" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--rd-accent)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--rd-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--rd-accent)" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="rd-sun-glow">
            <stop offset="0%" stopColor={isDay ? '#ffd66b' : '#cdd6ff'} stopOpacity="0.9" />
            <stop offset="100%" stopColor={isDay ? '#ffd66b' : '#cdd6ff'} stopOpacity="0" />
          </radialGradient>
        </defs>

        <line x1={pad - 6} y1={cy} x2={W - pad + 6} y2={cy} className="rd-sunarc__horizon" />
        <path
          d={arc}
          fill="none"
          stroke="url(#rd-sun-track)"
          strokeWidth="2.5"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />

        <circle cx={sx} cy={sy} r="20" fill="url(#rd-sun-glow)" />
        <circle cx={sx} cy={sy} r="7" className={`rd-sunarc__body ${isDay ? 'is-day' : 'is-night'}`} />
      </svg>

      <div className="rd-sunarc__labels">
        <div>
          <span className="rd-sunarc__ico">↑</span>
          <strong>{fmtTime(sun.rising)}</strong>
          <small>Aufgang</small>
        </div>
        <div className="rd-sunarc__elev">
          <strong>{num(sun.elevation)}°</strong>
          <small>{isDay ? 'Sonnenstand' : 'unter Horizont'}</small>
        </div>
        <div>
          <span className="rd-sunarc__ico">↓</span>
          <strong>{fmtTime(sun.setting)}</strong>
          <small>Untergang</small>
        </div>
      </div>
    </div>
  );
}
