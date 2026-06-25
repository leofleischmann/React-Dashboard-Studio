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
