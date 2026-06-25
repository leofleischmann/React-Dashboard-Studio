import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
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
  /** X-axis tick count including start and end (default 5). */
  xTicks?: number;
  locale?: string;
  formatX?: (timestampMs: number) => string;
  formatY?: (value: number) => string;
};

type HoverState = {
  t: number;
  xPct: number;
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

function formatTooltipTime(timestampMs: number, locale: string, rangeMs: number): string {
  if (rangeMs < 24 * 3_600_000) {
    return new Date(timestampMs).toLocaleString(locale, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return new Date(timestampMs).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
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

function tickValues(min: number, max: number, count: number): number[] {
  if (count < 2) return [min, max];
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(min + ((max - min) * i) / (count - 1));
  }
  return out;
}

function valueAtTime(points: HistoryPoint[], t: number): number | undefined {
  if (points.length === 0) return undefined;
  if (t <= points[0].t) return points[0].v;
  if (t >= points[points.length - 1].t) return points[points.length - 1].v;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      return a.v + ((t - a.t) / span) * (b.v - a.v);
    }
  }
  return undefined;
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

function xTickLeftPct(value: number, range: [number, number]): number {
  const span = range[1] - range[0] || 1;
  return ((value - range[0]) / span) * 100;
}

function xTickAnchor(index: number, total: number): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start';
  if (index === total - 1) return 'end';
  return 'middle';
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
  axes?: ChartAxes;
  /** Hover tooltip with interpolated values (default true). */
  showTooltip?: boolean;
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
  xTicks,
  clipId,
  cursorXPct,
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
  xTicks: number[];
  clipId: string;
  cursorXPct?: number;
}) {
  if (plotW < 1) return null;

  const timeSpan = timeRange[1] - timeRange[0] || 1;

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
              <line key={`y-${v}`} x1={0} y1={y} x2={plotW} y2={y} className="rd-chart__grid-line" />
            );
          })}
          {xTicks.map((t) => {
            const x = ((t - timeRange[0]) / timeSpan) * plotW;
            return (
              <line
                key={`x-${t}`}
                x1={x}
                y1={0}
                x2={x}
                y2={plotH}
                className="rd-chart__grid-line rd-chart__grid-line--v"
              />
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

      {cursorXPct !== undefined && (
        <line
          x1={(cursorXPct / 100) * plotW}
          y1={0}
          x2={(cursorXPct / 100) * plotW}
          y2={plotH}
          className="rd-chart__cursor-line"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

function ChartTooltip({
  hover,
  active,
  timeSpan,
  locale,
  formatY,
}: {
  hover: HoverState;
  active: ChartSeries[];
  timeSpan: number;
  locale: string;
  formatY: (v: number) => string;
}) {
  const flip = hover.xPct > 72;

  return (
    <div
      className={`rd-chart__tooltip${flip ? ' rd-chart__tooltip--flip' : ''}`}
      style={{ left: `${hover.xPct}%` }}
    >
      <time className="rd-chart__tooltip-time">
        {formatTooltipTime(hover.t, locale, timeSpan)}
      </time>
      <ul className="rd-chart__tooltip-rows">
        {active.map((s) => {
          const v = valueAtTime(s.points, hover.t);
          if (v === undefined) return null;
          return (
            <li key={s.label}>
              <i style={{ background: s.color }} aria-hidden />
              <span className="rd-chart__tooltip-label">{s.label}</span>
              <strong>{formatY(v)}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChartPlotArea({
  plotRef,
  className,
  plotH,
  onPlotMove,
  onPlotLeave,
  children,
}: {
  plotRef: RefObject<HTMLDivElement>;
  className: string;
  plotH: number;
  onPlotMove: (e: MouseEvent<HTMLDivElement>) => void;
  onPlotLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={plotRef}
      className={className}
      style={{ height: plotH }}
      onMouseMove={onPlotMove}
      onMouseLeave={onPlotLeave}
    >
      {children}
    </div>
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
  showTooltip = true,
}: SparkChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const clipId = useId().replace(/:/g, '');
  const [plotW, setPlotW] = useState(width);
  const [hover, setHover] = useState<HoverState | null>(null);

  const active = series.filter((s) => s.points.length >= 2);
  const hasAxes = axes !== undefined;
  const plotH = height ?? (hasAxes ? DEFAULT_PLOT_H : 88);

  const showTicks = axes?.showTicks ?? hasAxes;
  const locale = axes?.locale ?? 'de-DE';
  const timeRange = combinedTimeRange(active);
  const timeSpan = timeRange[1] - timeRange[0];
  const formatX =
    axes?.formatX ?? ((t: number) => defaultFormatX(t, locale, timeSpan));
  const formatY = axes?.formatY ?? ((v: number) => defaultFormatY(v, locale));
  const yTickCount = Math.max(2, axes?.yTicks ?? 4);
  const xTickCount = Math.max(2, axes?.xTicks ?? 5);

  const valueDomain = hasAxes ? combinedValueDomain(active) : ([0, 1] as [number, number]);
  const yTicks = hasAxes && showTicks ? tickValues(valueDomain[0], valueDomain[1], yTickCount) : [];
  const xTicks = hasAxes && showTicks ? tickValues(timeRange[0], timeRange[1], xTickCount) : [];

  useEffect(() => {
    const el = hasAxes ? plotRef.current : sparkRef.current;
    if (!el) return;
    const update = () => setPlotW(Math.max(Math.floor(el.clientWidth), 1));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasAxes]);

  const onPlotMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!showTooltip || timeSpan <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const t = timeRange[0] + ratio * timeSpan;
      setHover({ t, xPct: ratio * 100 });
    },
    [showTooltip, timeRange, timeSpan],
  );

  const onPlotLeave = useCallback(() => setHover(null), []);

  const plotSvg = (
    <PlotSvg
      active={active}
      plotW={plotW}
      plotH={plotH}
      strokeWidth={strokeWidth}
      hasAxes={hasAxes}
      valueDomain={valueDomain}
      timeRange={timeRange}
      showTicks={showTicks}
      yTicks={yTicks}
      xTicks={xTicks}
      clipId={clipId}
      cursorXPct={hover?.xPct}
    />
  );

  const tooltip =
    showTooltip && hover ? (
      <ChartTooltip
        hover={hover}
        active={active}
        timeSpan={timeSpan}
        locale={locale}
        formatY={formatY}
      />
    ) : null;

  if (active.length === 0) {
    return (
      <div className="rd-chart">
        <p className="rd-chart__empty">{loading ? loadingLabel : emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={`rd-chart${hasAxes ? ' rd-chart--axes' : ''}${showTooltip ? ' rd-chart--interactive' : ''}`}
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
            <ChartPlotArea
              plotRef={plotRef}
              className="rd-chart__plot"
              plotH={plotH}
              onPlotMove={onPlotMove}
              onPlotLeave={onPlotLeave}
            >
              {plotSvg}
              {tooltip}
            </ChartPlotArea>
          </div>
          {(showTicks || axes?.xLabel) && (
            <div
              className="rd-chart__x-footer"
              style={{ paddingLeft: showTicks || axes?.yLabel ? Y_AXIS_W : 0 }}
            >
              {showTicks && (
                <div className="rd-chart__x-ticks">
                  {xTicks.map((t, i) => (
                    <span
                      key={t}
                      className={`rd-chart__tick-x rd-chart__tick-x--${xTickAnchor(i, xTicks.length)}`}
                      style={{ left: `${xTickLeftPct(t, timeRange)}%` }}
                    >
                      {formatX(t)}
                    </span>
                  ))}
                </div>
              )}
              {axes?.xLabel && <span className="rd-chart__xlabel">{axes.xLabel}</span>}
            </div>
          )}
        </div>
      ) : (
        <ChartPlotArea
          plotRef={sparkRef}
          className="rd-chart__spark"
          plotH={plotH}
          onPlotMove={onPlotMove}
          onPlotLeave={onPlotLeave}
        >
          {plotSvg}
          {tooltip}
        </ChartPlotArea>
      )}
    </div>
  );
}

/** Alias for {@link SparkChart} — history-focused naming. */
export const HistoryChart = SparkChart;
