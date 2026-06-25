import { useEffect, useId, useRef, useState } from 'react';
import type { HistoryPoint } from '../hass/history';
import './charts.css';

export type ChartSeries = {
  points: HistoryPoint[];
  color: string;
  label: string;
  domain?: [number, number];
};

export type ChartAxes = {
  xLabel?: string;
  yLabel?: string;
  showTicks?: boolean;
  yTicks?: number;
  locale?: string;
  formatX?: (timestampMs: number) => string;
  formatY?: (value: number) => string;
};

const DEFAULT_PLOT_H = 72;
const Y_AXIS_W = 40;

function defaultFormatX(timestampMs: number, locale: string, rangeMs: number): string {
  if (rangeMs < 36 * 3_600_000) {
    return new Date(timestampMs).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return new Date(timestampMs).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultFormatY(value: number, locale: string): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return value.toLocaleString(locale, { maximumFractionDigits: digits });
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
    const x = ((p.t - tMin) / tSpan) * plotW;
    const y = plotH - ((p.v - dMin) / range) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${coords.join(' L ')}`;
}

function gradientId(label: string): string {
  return `fill-${label.replace(/\s/g, '')}`;
}

function yTickTopPct(value: number, domain: [number, number]): number {
  const span = domain[1] - domain[0] || 1;
  return (1 - (value - domain[0]) / span) * 100;
}

export type SparkChartProps = {
  series: ChartSeries[];
  /** Plot area height in px (footer with axes is extra). */
  height?: number;
  width?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  axes?: ChartAxes;
};

function PlotSvg({
  active,
  plotW,
  plotH,
  strokeWidth,
  hasAxes,
  valueDomain,
  timeRange,
  showTicks,
  yTicks,
  clipId,
}: {
  active: ChartSeries[];
  plotW: number;
  plotH: number;
  strokeWidth: number;
  hasAxes: boolean;
  valueDomain: [number, number];
  timeRange: [number, number];
  showTicks: boolean;
  yTicks: number[];
  clipId: string;
}) {
  if (plotW < 1) return null;

  return (
    <svg
      viewBox={`0 0 ${plotW} ${plotH}`}
      className="rd-chart__svg"
      width={plotW}
      height={plotH}
      preserveAspectRatio="none"
      aria-hidden
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
        <clipPath id={clipId}>
          <rect x="0" y="0" width={plotW} height={plotH} rx="4" />
        </clipPath>
      </defs>

      {hasAxes && showTicks && (
        <g className="rd-chart__grid">
          {yTicks.map((v) => {
            const y = plotH - ((v - valueDomain[0]) / (valueDomain[1] - valueDomain[0] || 1)) * plotH;
            return (
              <line key={v} x1={0} y1={y} x2={plotW} y2={y} className="rd-chart__grid-line" />
            );
          })}
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} className="rd-chart__axis-line" />
          <line x1={0} y1={0} x2={0} y2={plotH} className="rd-chart__axis-line" />
        </g>
      )}

      <g clipPath={`url(#${clipId})`}>
        {active.map((s) => {
          const domain = hasAxes ? valueDomain : (s.domain ?? seriesDomain(s.points));
          const tRange = hasAxes
            ? timeRange
            : ([s.points[0].t, s.points[s.points.length - 1].t] as [number, number]);
          const d = pathFor(s.points, plotW, plotH, domain, tRange);
          if (!d) return null;
          const fillD = `${d} L ${plotW},${plotH} L 0,${plotH} Z`;
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
    </svg>
  );
}

/** Multi-series sparkline / area chart for history data. */
export function SparkChart({
  series,
  height,
  width = 320,
  strokeWidth = 2,
  showLegend = true,
  loading = false,
  emptyLabel = 'Kein Verlauf',
  loadingLabel = 'Verlauf wird geladen…',
  axes,
}: SparkChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const clipId = useId().replace(/:/g, '');
  const [plotW, setPlotW] = useState(width);

  const active = series.filter((s) => s.points.length >= 2);
  const hasAxes = axes !== undefined;
  const plotH = height ?? (hasAxes ? DEFAULT_PLOT_H : 88);

  useEffect(() => {
    const el = hasAxes ? plotRef.current : sparkRef.current;
    if (!el) return;
    const update = () => setPlotW(Math.max(Math.floor(el.clientWidth), 1));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasAxes]);

  const showTicks = axes?.showTicks ?? hasAxes;
  const locale = axes?.locale ?? 'de-DE';
  const timeRange = hasAxes ? combinedTimeRange(active) : ([0, 1] as [number, number]);
  const timeSpan = timeRange[1] - timeRange[0];
  const formatX =
    axes?.formatX ?? ((t: number) => defaultFormatX(t, locale, timeSpan));
  const formatY = axes?.formatY ?? ((v: number) => defaultFormatY(v, locale));
  const yTickCount = Math.max(2, axes?.yTicks ?? 4);

  const valueDomain = hasAxes ? combinedValueDomain(active) : ([0, 1] as [number, number]);
  const yTicks = hasAxes && showTicks ? yTickValues(valueDomain[0], valueDomain[1], yTickCount) : [];

  if (active.length === 0) {
    return (
      <div className="rd-chart">
        <p className="rd-chart__empty">{loading ? loadingLabel : emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={`rd-chart${hasAxes ? ' rd-chart--axes' : ''}`}
      role="img"
      aria-label={axes?.yLabel ? `Chart: ${axes.yLabel}` : 'Verlaufsdiagramm'}
    >
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

      {hasAxes ? (
        <div className="rd-chart__frame">
          <div className="rd-chart__row" style={{ height: plotH }}>
            {(showTicks || axes?.yLabel) && (
              <div className="rd-chart__y-axis" style={{ width: Y_AXIS_W }}>
                {axes?.yLabel && <span className="rd-chart__ylabel">{axes.yLabel}</span>}
                {showTicks && (
                  <div className="rd-chart__y-ticks">
                    {yTicks.map((v) => (
                      <span
                        key={v}
                        className="rd-chart__tick-y"
                        style={{ top: `${yTickTopPct(v, valueDomain)}%` }}
                      >
                        {formatY(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div ref={plotRef} className="rd-chart__plot" style={{ height: plotH }}>
              <PlotSvg
                active={active}
                plotW={plotW}
                plotH={plotH}
                strokeWidth={strokeWidth}
                hasAxes
                valueDomain={valueDomain}
                timeRange={timeRange}
                showTicks={showTicks}
                yTicks={yTicks}
                clipId={clipId}
              />
            </div>
          </div>
          {(showTicks || axes?.xLabel) && (
            <div
              className="rd-chart__x-footer"
              style={{ paddingLeft: showTicks || axes?.yLabel ? Y_AXIS_W : 0 }}
            >
              {showTicks && (
                <span className="rd-chart__tick-x">{formatX(timeRange[0])}</span>
              )}
              {axes?.xLabel && <span className="rd-chart__xlabel">{axes.xLabel}</span>}
              {showTicks && (
                <span className="rd-chart__tick-x">{formatX(timeRange[1])}</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div ref={sparkRef} className="rd-chart__spark" style={{ height: plotH }}>
          <PlotSvg
            active={active}
            plotW={plotW}
            plotH={plotH}
            strokeWidth={strokeWidth}
            hasAxes={false}
            valueDomain={valueDomain}
            timeRange={timeRange}
            showTicks={false}
            yTicks={[]}
            clipId={clipId}
          />
        </div>
      )}
    </div>
  );
}

/** Alias for {@link SparkChart} — history-focused naming. */
export const HistoryChart = SparkChart;
