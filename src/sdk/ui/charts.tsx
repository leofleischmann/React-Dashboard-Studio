import type { HistoryPoint } from '../hass/history';
import './charts.css';

export type ChartSeries = {
  points: HistoryPoint[];
  color: string;
  label: string;
  domain?: [number, number];
};

export type ChartAxes = {
  /** Title below the X axis (e.g. "Zeit"). */
  xLabel?: string;
  /** Title beside the Y axis (e.g. "W" or "°C"). */
  yLabel?: string;
  /** Draw tick labels and grid lines (default true when `axes` is set). */
  showTicks?: boolean;
  /** Y-axis tick count including min and max (default 4). */
  yTicks?: number;
  /** BCP 47 locale for default time formatting (default `de-DE`). */
  locale?: string;
  formatX?: (timestampMs: number) => string;
  formatY?: (value: number) => string;
};

const PLOT_MARGIN = { top: 10, right: 10, bottom: 34, left: 44 };

function defaultFormatX(timestampMs: number, locale: string): string {
  return new Date(timestampMs).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultFormatY(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 1 });
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

function combinedValueDomain(series: ChartSeries[]): [number, number] {
  const domains = series.map((s) => s.domain ?? seriesDomain(s.points));
  return [
    Math.min(...domains.map((d) => d[0])),
    Math.max(...domains.map((d) => d[1])),
  ];
}

function combinedTimeRange(series: ChartSeries[]): [number, number] {
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const s of series) {
    if (s.points.length === 0) continue;
    tMin = Math.min(tMin, s.points[0].t);
    tMax = Math.max(tMax, s.points[s.points.length - 1].t);
  }
  if (!Number.isFinite(tMin)) return [0, 1];
  return [tMin, tMax];
}

function yTickValues(min: number, max: number, count: number): number[] {
  if (count < 2) return [min, max];
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(min + ((max - min) * i) / (count - 1));
  }
  return out;
}

function pathFor(
  points: HistoryPoint[],
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  domain: [number, number],
  tRange: [number, number],
): string {
  if (points.length < 2) return '';
  const [dMin, dMax] = domain;
  const range = dMax - dMin || 1;
  const [tMin, tMax] = tRange;
  const tSpan = tMax - tMin || 1;

  const coords = points.map((p) => {
    const x = plotX + ((p.t - tMin) / tSpan) * plotW;
    const y = plotY + plotH - ((p.v - dMin) / range) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${coords.join(' L ')}`;
}

function gradientId(label: string): string {
  return `fill-${label.replace(/\s/g, '')}`;
}

export type SparkChartProps = {
  series: ChartSeries[];
  height?: number;
  width?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  /** Axis titles and optional tick labels — omit for a plain sparkline. */
  axes?: ChartAxes;
};

/** Multi-series sparkline / area chart for history data. */
export function SparkChart({
  series,
  height = 88,
  width = 320,
  strokeWidth = 2,
  showLegend = true,
  loading = false,
  emptyLabel = 'Kein Verlauf',
  loadingLabel = 'Verlauf wird geladen…',
  axes,
}: SparkChartProps) {
  const active = series.filter((s) => s.points.length >= 2);
  const hasAxes = axes !== undefined;
  const showTicks = axes?.showTicks ?? hasAxes;
  const locale = axes?.locale ?? 'de-DE';
  const formatX = axes?.formatX ?? ((t: number) => defaultFormatX(t, locale));
  const formatY = axes?.formatY ?? ((v: number) => defaultFormatY(v, locale));
  const yTickCount = Math.max(2, axes?.yTicks ?? 4);

  const margin = hasAxes ? PLOT_MARGIN : { top: 0, right: 0, bottom: 0, left: 0 };
  const plotX = margin.left;
  const plotY = margin.top;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const valueDomain = hasAxes ? combinedValueDomain(active) : ([0, 1] as [number, number]);
  const timeRange = hasAxes ? combinedTimeRange(active) : ([0, 1] as [number, number]);
  const yTicks = hasAxes && showTicks ? yTickValues(valueDomain[0], valueDomain[1], yTickCount) : [];
  const xTickTimes = hasAxes && showTicks ? [timeRange[0], timeRange[1]] : [];

  if (active.length === 0) {
    return (
      <div className="rd-chart">
        <p className="rd-chart__empty">{loading ? loadingLabel : emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={`rd-chart${hasAxes ? ' rd-chart--axes' : ''}`}>
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
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={axes?.yLabel ? `Chart: ${axes.yLabel}` : 'Verlaufsdiagramm'}
      >
        <defs>
          {active.map((s) => {
            const gid = gradientId(s.label);
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            );
          })}
          {hasAxes && (
            <clipPath id="rd-chart-plot-clip">
              <rect x={plotX} y={plotY} width={plotW} height={plotH} rx="4" />
            </clipPath>
          )}
        </defs>

        {hasAxes && showTicks && (
          <g className="rd-chart__grid" aria-hidden>
            {yTicks.map((v) => {
              const y =
                plotY + plotH - ((v - valueDomain[0]) / (valueDomain[1] - valueDomain[0] || 1)) * plotH;
              return (
                <g key={v}>
                  <line x1={plotX} y1={y} x2={plotX + plotW} y2={y} className="rd-chart__grid-line" />
                  <text x={plotX - 6} y={y} className="rd-chart__tick rd-chart__tick--y" textAnchor="end" dominantBaseline="middle">
                    {formatY(v)}
                  </text>
                </g>
              );
            })}
            {xTickTimes.map((t) => {
              const x = plotX + ((t - timeRange[0]) / (timeRange[1] - timeRange[0] || 1)) * plotW;
              return (
                <text
                  key={t}
                  x={x}
                  y={plotY + plotH + 14}
                  className="rd-chart__tick rd-chart__tick--x"
                  textAnchor={t === timeRange[0] ? 'start' : 'end'}
                >
                  {formatX(t)}
                </text>
              );
            })}
            <line
              x1={plotX}
              y1={plotY + plotH}
              x2={plotX + plotW}
              y2={plotY + plotH}
              className="rd-chart__axis-line"
            />
            <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} className="rd-chart__axis-line" />
          </g>
        )}

        <g clipPath={hasAxes ? 'url(#rd-chart-plot-clip)' : undefined}>
          {active.map((s) => {
            const domain = hasAxes ? valueDomain : (s.domain ?? seriesDomain(s.points));
            const tRange = hasAxes
              ? timeRange
              : ([s.points[0].t, s.points[s.points.length - 1].t] as [number, number]);
            const d = pathFor(s.points, plotX, plotY, plotW, plotH, domain, tRange);
            if (!d) return null;
            const bottom = plotY + plotH;
            const fillD = `${d} L ${plotX + plotW},${bottom} L ${plotX},${bottom} Z`;
            const gid = gradientId(s.label);
            return (
              <g key={s.label}>
                <path d={fillD} fill={`url(#${gid})`} />
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </g>

        {axes?.yLabel && (
          <text
            x={10}
            y={plotY + plotH / 2}
            className="rd-chart__axis-label rd-chart__axis-label--y"
            textAnchor="middle"
            transform={`rotate(-90, 10, ${plotY + plotH / 2})`}
          >
            {axes.yLabel}
          </text>
        )}
        {axes?.xLabel && (
          <text
            x={plotX + plotW / 2}
            y={height - 4}
            className="rd-chart__axis-label rd-chart__axis-label--x"
            textAnchor="middle"
          >
            {axes.xLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

/** Alias for {@link SparkChart} — history-focused naming. */
export const HistoryChart = SparkChart;
