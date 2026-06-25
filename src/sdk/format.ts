import type { HassEntity } from './hass/types';
import { registryStore } from './hass/registryStore';
import { hassStore } from './hass/store';

const UNAVAILABLE = new Set(['unavailable', 'unknown', 'none', '']);

/** Is the entity present and reporting a usable value? */
export function isAvailable(entity?: HassEntity): entity is HassEntity {
  return !!entity && !UNAVAILABLE.has(entity.state);
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(n) ? undefined : n;
}

/** German-formatted number, or "–" if not a number. */
export function num(
  value: string | number | undefined,
  maximumFractionDigits = 1,
): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  return n.toLocaleString('de-DE', { maximumFractionDigits });
}

/** German Euro formatting. */
export function euro(value: string | number | undefined): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

/** Numeric value of an entity's state, or undefined. */
export function stateNumber(entity?: HassEntity): number | undefined {
  return isAvailable(entity) ? toNumber(entity.state) : undefined;
}

/** Temperature with unit (default °C). */
export function temp(
  value: string | number | undefined,
  unit = '°C',
): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  return `${num(n, 1)} ${unit}`;
}

/** Percentage value. */
export function pct(value: string | number | undefined): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  return `${num(n, 0)} %`;
}

/** Power in watts. */
export function power(value: string | number | undefined): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  return `${num(n, 0)} W`;
}

/** Energy in kWh. */
export function energy(value: string | number | undefined): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  return `${num(n, 2)} kWh`;
}

/** Light brightness: 0–255 or percent string -> display percent. */
export function brightness(value: string | number | undefined): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  const pctVal = n <= 1 ? Math.round(n * 100) : n <= 100 ? Math.round(n) : Math.round((n / 255) * 100);
  return `${pctVal} %`;
}

/** Color temperature: mired or Kelvin -> Kelvin display. */
export function colorTemp(value: string | number | undefined): string {
  const n = toNumber(value);
  if (n === undefined) return '–';
  const kelvin = n > 1000 ? Math.round(n) : Math.round(1_000_000 / n);
  return `${kelvin} K`;
}

const DEVICE_CLASS_ICONS: Record<string, string> = {
  temperature: '🌡️',
  humidity: '💧',
  power: '⚡',
  energy: '🔋',
  battery: '🔋',
  motion: '🚶',
  door: '🚪',
  window: '🪟',
  smoke: '🔥',
  gas: '💨',
  light: '💡',
  illuminance: '☀️',
  pressure: '📊',
  co2: '🌿',
  pm25: '🌫️',
  voltage: '⚡',
  current: '⚡',
  timestamp: '🕐',
  connectivity: '📶',
  running: '▶️',
  problem: '⚠️',
  safety: '🛡️',
  tamper: '🔒',
  update: '🔄',
  plug: '🔌',
  water: '💧',
  carbon_monoxide: '☠️',
  cold: '❄️',
  heat: '🔥',
};

/** Emoji for a sensor device_class when no entity icon is set. */
export function deviceClassIcon(deviceClass?: string): string {
  if (!deviceClass) return '📟';
  return DEVICE_CLASS_ICONS[deviceClass] ?? '📟';
}

/** Friendly display name — registry name, then state friendly_name, then entity_id. */
export function entityDisplayName(
  entity?: HassEntity,
  fallback = '–',
): string {
  if (!entity) return fallback;
  const regName = registryStore.getEntityEntry(entity.entity_id)?.name;
  if (regName?.trim()) return regName;
  const name = entity.attributes.friendly_name;
  if (typeof name === 'string' && name.trim()) return name;
  return entity.entity_id;
}

/** Display name by entity id (uses registry when loaded). */
export function entityDisplayNameForId(
  entityId: string,
  fallback = entityId,
): string {
  const regName = registryStore.getEntityEntry(entityId)?.name;
  if (regName?.trim()) return regName;
  const entity = hassStore.getEntity(entityId);
  return entityDisplayName(entity, fallback);
}

const STATE_LABELS: Record<string, string> = {
  on: 'An',
  off: 'Aus',
  open: 'Offen',
  closed: 'Geschlossen',
  locked: 'Verriegelt',
  unlocked: 'Entriegelt',
  opening: 'Öffnet',
  closing: 'Schließt',
  home: 'Zuhause',
  not_home: 'Abwesend',
  idle: 'Bereit',
  playing: 'Wiedergabe',
  paused: 'Pause',
  standby: 'Standby',
  unavailable: 'Nicht verfügbar',
  unknown: 'Unbekannt',
  heat: 'Heizen',
  cool: 'Kühlen',
  auto: 'Auto',
  dry: 'Trocknen',
  fan_only: 'Ventilator',
  heat_cool: 'Heizen/Kühlen',
  cleaning: 'Reinigt',
  docked: 'Angedockt',
  returning: 'Kehrt zurück',
  armed_home: 'Scharf (Zuhause)',
  armed_away: 'Scharf (Abwesend)',
  armed_night: 'Scharf (Nacht)',
  arming: 'Scharfschaltung',
  triggered: 'Alarm',
  pending: 'Ausstehend',
  active: 'Aktiv',
  completed: 'Fertig',
};

/** Human-readable German label for common entity states. */
export function stateLabel(state?: string, domain?: string): string {
  if (!state) return '–';
  const key = domain ? `${domain}.${state}` : state;
  if (STATE_LABELS[key]) return STATE_LABELS[key];
  if (STATE_LABELS[state]) return STATE_LABELS[state];
  return state.replace(/_/g, ' ');
}

/** Semantic CSS color variable for a state string. */
export function stateColor(state?: string): string {
  if (!state || UNAVAILABLE.has(state)) return 'var(--rd-danger)';
  switch (state) {
    case 'on':
    case 'open':
    case 'unlocked':
    case 'home':
    case 'playing':
    case 'active':
    case 'cleaning':
    case 'completed':
      return 'var(--rd-ok)';
    case 'off':
    case 'closed':
    case 'locked':
    case 'not_home':
    case 'idle':
    case 'docked':
    case 'paused':
    case 'standby':
      return 'var(--rd-text-2)';
    case 'triggered':
    case 'arming':
      return 'var(--rd-danger)';
    case 'pending':
    case 'returning':
      return 'var(--rd-warn)';
    default:
      return 'var(--rd-accent)';
  }
}

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

/** Map a HA weather condition to an emoji. */
export function weatherIcon(condition?: string): string {
  switch (condition) {
    case 'sunny':
      return '☀️';
    case 'clear-night':
      return '🌙';
    case 'partlycloudy':
      return '⛅';
    case 'cloudy':
      return '☁️';
    case 'fog':
      return '🌫️';
    case 'rainy':
    case 'pouring':
      return '🌧️';
    case 'lightning':
    case 'lightning-rainy':
      return '⛈️';
    case 'snowy':
    case 'snowy-rainy':
      return '❄️';
    case 'windy':
    case 'windy-variant':
      return '💨';
    case 'hail':
      return '🌨️';
    default:
      return '🌡️';
  }
}

/** Color for a battery percentage. */
export function batteryColor(pct: number | undefined): string {
  if (pct === undefined) return 'var(--rd-text-2)';
  if (pct <= 15) return 'var(--rd-danger)';
  if (pct <= 35) return 'var(--rd-warn)';
  return 'var(--rd-ok)';
}
