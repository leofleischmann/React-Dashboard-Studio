// Pure math/format helpers for the chart components (no React, no DOM).
import type { HistoryPoint } from '../hass/sources/history';
import type { ChartSeries } from './charts';

export function defaultFormatX(timestampMs: number, locale: string, rangeMs: number): string {
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

export function formatTooltipTime(timestampMs: number, locale: string, rangeMs: number): string {
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

export function defaultFormatY(value: number, locale: string): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return value.toLocaleString(locale, { maximumFractionDigits: digits });
}

export function seriesDomain(points: HistoryPoint[], pad = 0.08): [number, number] {
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

export function combinedValueDomain(series: ChartSeries[]): [number, number] {
  const domains = series.map((s) => s.domain ?? seriesDomain(s.points));
  return [
    Math.min(...domains.map((d) => d[0])),
    Math.max(...domains.map((d) => d[1])),
  ];
}

export function combinedTimeRange(series: ChartSeries[]): [number, number] {
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

export function tickValues(min: number, max: number, count: number): number[] {
  if (count < 2) return [min, max];
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(min + ((max - min) * i) / (count - 1));
  }
  return out;
}

export function valueAtTime(points: HistoryPoint[], t: number): number | undefined {
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

export function pathFor(
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

export function gradientId(label: string): string {
  return `fill-${label.replace(/\s/g, '')}`;
}

export function yTickTopPct(value: number, domain: [number, number]): number {
  const span = domain[1] - domain[0] || 1;
  return (1 - (value - domain[0]) / span) * 100;
}

export function xTickLeftPct(value: number, range: [number, number]): number {
  const span = range[1] - range[0] || 1;
  return ((value - range[0]) / span) * 100;
}

export function xTickAnchor(index: number, total: number): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start';
  if (index === total - 1) return 'end';
  return 'middle';
}

export function tooltipAlign(xPct: number): 'center' | 'start' | 'end' {
  if (xPct > 70) return 'end';
  if (xPct < 16) return 'start';
  return 'center';
}
