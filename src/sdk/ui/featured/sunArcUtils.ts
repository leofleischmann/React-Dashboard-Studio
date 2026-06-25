/** Moon phase 0..1 (0 = new, 0.5 = full). */
export function moonPhase(date: Date): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.530588853 * 86_400_000;
  return (((date.getTime() - ref) % synodic) + synodic) % synodic / synodic;
}

export function formatSunEvent(date: Date | undefined, now: Date): string {
  if (!date) return '—';
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() !== now.toDateString()) return `morgen ${time}`;
  return time;
}

export function formatDaylightRemaining(ms: number): string | null {
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `noch ${h}h ${m}min Tageslicht`;
  return `noch ${m} min Tageslicht`;
}

export type SkyTone = 'day' | 'twilight' | 'night';

export function skyTone(elevation: number | undefined, isDay: boolean): SkyTone {
  const elev = elevation ?? 0;
  if (!isDay || elev < -4) return 'night';
  if (elev < 6) return 'twilight';
  return 'day';
}

/** Golden hour: low sun near horizon while still day. */
export function isGoldenHour(elevation: number | undefined, isDay: boolean): boolean {
  if (!isDay) return false;
  const elev = elevation ?? 0;
  return elev >= 0 && elev <= 14;
}
