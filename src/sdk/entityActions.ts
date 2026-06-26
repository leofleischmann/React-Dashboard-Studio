import type { HassEntity } from './hass/types';

/** Default HA service per domain for one-click / snippet actions. */
export const ENTITY_ACTION: Record<string, string> = {
  light: 'toggle',
  switch: 'toggle',
  fan: 'toggle',
  cover: 'toggle',
  lock: 'unlock',
  input_boolean: 'toggle',
  input_button: 'press',
  button: 'press',
  media_player: 'media_play_pause',
  script: 'turn_on',
  scene: 'turn_on',
  automation: 'trigger',
  vacuum: 'start',
  valve: 'toggle',
  siren: 'toggle',
  humidifier: 'toggle',
  water_heater: 'toggle',
};

export const TOGGLE_DOMAINS = new Set([
  'light',
  'switch',
  'fan',
  'cover',
  'lock',
  'input_boolean',
  'humidifier',
  'water_heater',
  'siren',
  'valve',
]);

export const PRESS_DOMAINS = new Set(['script', 'scene', 'button', 'input_button', 'automation']);

export function entityDomain(entityId: string): string {
  return entityId.split('.')[0] ?? entityId;
}

/** States that mean "no data" regardless of domain. */
export const UNAVAILABLE_STATES: ReadonlySet<string> = new Set(['unavailable', 'unknown']);

/**
 * Per-domain states that count as "on / active". Domains not listed here use the
 * generic `state === 'on'` rule; `climate`/`water_heater` are "on" unless `off`.
 */
const ON_STATES_BY_DOMAIN: Record<string, ReadonlySet<string>> = {
  cover: new Set(['open', 'opening']),
  valve: new Set(['open', 'opening']),
  lock: new Set(['unlocked', 'open', 'opening']),
  media_player: new Set(['playing', 'paused', 'buffering', 'on']),
  vacuum: new Set(['cleaning', 'returning', 'on']),
  binary_sensor: new Set(['on']),
  person: new Set(['home']),
  device_tracker: new Set(['home']),
};

/** True when the entity has a usable state (not unavailable/unknown). */
export function isEntityAvailable(entity: HassEntity | undefined): boolean {
  return !!entity && !UNAVAILABLE_STATES.has(entity.state);
}

/**
 * Domain-aware "is this entity on/active?" — handles cover (open), lock
 * (unlocked), media_player (playing/paused), climate (not off), etc., so tiles
 * don't each reinvent the check.
 */
export function isEntityOn(entity: HassEntity | undefined): boolean {
  if (!isEntityAvailable(entity) || !entity) return false;
  const { state } = entity;
  const domain = entityDomain(entity.entity_id);
  if (domain === 'climate' || domain === 'water_heater') return state !== 'off';
  const onStates = ON_STATES_BY_DOMAIN[domain];
  return onStates ? onStates.has(state) : state === 'on';
}

export function defaultEntityService(entityId: string): string {
  return ENTITY_ACTION[entityDomain(entityId)] ?? 'toggle';
}

export function entityActionSnippet(entityId: string): string {
  const domain = entityDomain(entityId);
  const service = defaultEntityService(entityId);
  return `callService('${domain}', '${service}', { entity_id: '${entityId}' })`;
}

export function entityValueSnippet(entityId: string): string {
  return `useEntity('${entityId}')?.state`;
}

export function entityTemplateSnippet(entityId: string): string {
  return `useTemplate("{{ states('${entityId}') }}").value`;
}

export function entityIdSnippet(entityId: string): string {
  return `'${entityId}'`;
}
