import type { HistoryPoint } from '../hass/history';

export type ChartSeries = {
  points: HistoryPoint[];
  color: string;
  label: string;
  domain?: [number, number];
};

function pathFor(
  points: HistoryPoint[],
  width: number,
  height: number,
  domain: [number, number],
): string {
  if (points.length < 2) return '';
  const [dMin, dMax] = domain;
  const range = dMax - dMin || 1;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const tRange = tMax - tMin || 1;

  const coords = points.map((p) => {
    const x = ((p.t - tMin) / tRange) * width;
    const y = height - ((p.v - dMin) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${coords.join(' L ')}`;
}

function seriesDomain(points: HistoryPoint[], pad = 0.08): [number, number] {
  if (points.length === 0) return [0, 1];
  let min = points[0].v;
  let max = points[0].v;
  for (const p of points) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  const span = max - min || 1;
  return [min - span * pad, max + span * pad];
}

/** Multi-series sparkline / area chart for history data. */
export function SparkChart({
  series,
  height = 88,
  showLegend = true,
  emptyLabel = 'Verlauf wird geladen…',
}: {
  series: ChartSeries[];
  height?: number;
  showLegend?: boolean;
  emptyLabel?: string;
}) {
  const width = 320;
  const active = series.filter((s) => s.points.length >= 2);

  if (active.length === 0) {
    return (
      <div className="rd-chart">
        <p className="rd-chart__empty">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="rd-chart">
      {showLegend && (
        <div className="rd-chart__legend">
          {active.map((s) => (
            <span key={s.label} className="rd-chart__legend-item">
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="rd-chart__svg"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          {active.map((s) => (
            <linearGradient
              key={`g-${s.label}`}
              id={`fill-${s.label.replace(/\s/g, '')}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {active.map((s) => {
          const domain = s.domain ?? seriesDomain(s.points);
          const d = pathFor(s.points, width, height, domain);
          if (!d) return null;
          const fillD = `${d} L ${width},${height} L 0,${height} Z`;
          const gid = `fill-${s.label.replace(/\s/g, '')}`;
          return (
            <g key={s.label}>
              <path d={fillD} fill={`url(#${gid})`} />
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Alias for {@link SparkChart} — history-focused naming. */
export const HistoryChart = SparkChart;
