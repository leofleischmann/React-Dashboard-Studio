import type { HassEntity } from '../hass/types';

/** Relative time in German, e.g. "vor 5 Min.". */
export function relativeTime(
  isoOrMs: string | number | Date | undefined,
  nowMs = Date.now(),
): string {
  if (isoOrMs === undefined) return '–';
  const ts =
    typeof isoOrMs === 'string'
      ? new Date(isoOrMs).getTime()
      : typeof isoOrMs === 'number'
        ? isoOrMs
        : isoOrMs.getTime();
  if (!Number.isFinite(ts)) return '–';

  const diffSec = Math.round((nowMs - ts) / 1000);
  const abs = Math.abs(diffSec);

  if (abs < 10) return 'gerade eben';
  if (abs < 60) return diffSec >= 0 ? `vor ${abs} Sek.` : `in ${abs} Sek.`;
  if (abs < 3600) {
    const m = Math.round(abs / 60);
    return diffSec >= 0 ? `vor ${m} Min.` : `in ${m} Min.`;
  }
  if (abs < 86_400) {
    const h = Math.round(abs / 3600);
    return diffSec >= 0 ? `vor ${h} Std.` : `in ${h} Std.`;
  }
  const d = Math.round(abs / 86_400);
  return diffSec >= 0 ? `vor ${d} Tag${d === 1 ? '' : 'en'}` : `in ${d} Tag${d === 1 ? '' : 'en'}`;
}

export type EntityAgeStyle = 'relative' | 'since';

/** How long an entity has been in its current state (uses `last_changed`). */
export function entityAgeLabel(
  entity: HassEntity | undefined,
  options: { style?: EntityAgeStyle; nowMs?: number } = {},
): string {
  if (!entity?.last_changed) return '–';
  const relative = relativeTime(entity.last_changed, options.nowMs);
  if (relative === '–') return '–';
  if (options.style === 'since') {
    if (relative === 'gerade eben') return 'seit eben';
    if (relative.startsWith('vor ')) return `seit ${relative.slice(4)}`;
    return relative;
  }
  return relative;
}

/** Milliseconds since the entity entered its current state. */
export function entityAgeMs(
  entity: HassEntity | undefined,
  nowMs = Date.now(),
): number | undefined {
  if (!entity?.last_changed) return undefined;
  const ts = new Date(entity.last_changed).getTime();
  if (!Number.isFinite(ts)) return undefined;
  return Math.max(0, nowMs - ts);
}

/** Format seconds as H:MM:SS or M:SS. */
export function duration(totalSeconds: number | undefined): string {
  if (totalSeconds === undefined || !Number.isFinite(totalSeconds)) return '–';
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Time-of-day greeting. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  if (h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

/** Short day label for forecast rows: Heute, Morgen, Mo, … */
export function forecastDayLabel(
  date: Date,
  now = new Date(),
  locale = 'de-DE',
): string {
  const dayStart = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const diffDays = Math.round((dayStart(date) - dayStart(now)) / 86_400_000);
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Morgen';
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

function toDate(value: string | number | Date | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const d =
    typeof value === 'string'
      ? new Date(value)
      : typeof value === 'number'
        ? new Date(value)
        : value;
  return Number.isFinite(d.getTime()) ? d : undefined;
}

/** German date + time, e.g. "25.06.2026, 15:30". */
export function timestamp(
  isoOrDate: string | number | Date | undefined,
  locale = 'de-DE',
): string {
  const d = toDate(isoOrDate);
  if (!d) return '–';
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Weekday name, e.g. "Mittwoch". */
export function weekday(
  isoOrDate: string | number | Date | undefined,
  locale = 'de-DE',
): string {
  const d = toDate(isoOrDate);
  if (!d) return '–';
  return d.toLocaleDateString(locale, { weekday: 'long' });
}
