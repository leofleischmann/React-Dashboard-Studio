import type { HassEntity } from '../hass/types';
import { registryStore } from '../hass/stores/registryStore';
import { hassStore } from '../hass/stores/hassStore';
import { UNAVAILABLE } from './internal';

/** Is the entity present and reporting a usable value? */
export function isAvailable(entity?: HassEntity): entity is HassEntity {
  return !!entity && !UNAVAILABLE.has(entity.state);
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
