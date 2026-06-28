import type { HassEntity } from '../types';
import { registryStore } from '../stores/registryStore';

/** Domains to watch for `useEntities` — `*` when any entity may affect the filter. */
export function subscriptionDomainsForFilter(
  filter: EntityFilter,
): readonly string[] | '*' {
  if (filter.areaId || filter.labelId || filter.state || filter.pattern || filter.deviceClass) {
    return '*';
  }
  if (filter.domain) {
    return Array.isArray(filter.domain) ? filter.domain : [filter.domain];
  }
  return '*';
}

export type EntityFilter = {
  /** e.g. "sensor" or ["light", "switch"] */
  domain?: string | string[];
  /** Case-insensitive match against entity_id or friendly_name. */
  pattern?: string;
  /** Match attributes.device_class. */
  deviceClass?: string | string[];
  /** Requires entity registry (loaded automatically). */
  areaId?: string;
  /** Requires label registry (loaded automatically). */
  labelId?: string;
  /** Exact state match, e.g. "on". */
  state?: string;
};

function domainOf(entityId: string): string {
  return entityId.split('.')[0] ?? entityId;
}

function buildPatternMatcher(pattern: string): (entity: HassEntity) => boolean {
  let re: RegExp | null = null;
  try {
    re = new RegExp(pattern, 'i');
  } catch {
    // Invalid regex (e.g. a stray "[") — fall back to case-insensitive substring.
    re = null;
  }
  const needle = pattern.toLowerCase();

  return (entity) => {
    const name = entity.attributes.friendly_name;
    const nameStr = typeof name === 'string' ? name : '';
    if (re) return re.test(entity.entity_id) || re.test(nameStr);
    return (
      entity.entity_id.toLowerCase().includes(needle) ||
      nameStr.toLowerCase().includes(needle)
    );
  };
}

/** Filter entities from a list (non-reactive helper). */
export function filterEntities(
  entities: readonly HassEntity[],
  filter: EntityFilter,
): HassEntity[] {
  const domains = filter.domain
    ? Array.isArray(filter.domain)
      ? filter.domain
      : [filter.domain]
    : null;

  const deviceClasses = filter.deviceClass
    ? Array.isArray(filter.deviceClass)
      ? filter.deviceClass
      : [filter.deviceClass]
    : null;

  const areaEntities = filter.areaId
    ? new Set(registryStore.getEntitiesInArea(filter.areaId))
    : null;

  const labelEntities = filter.labelId
    ? new Set(registryStore.getEntitiesWithLabel(filter.labelId))
    : null;

  const patternMatch = filter.pattern ? buildPatternMatcher(filter.pattern) : null;

  return entities.filter((entity) => {
    if (domains && !domains.includes(domainOf(entity.entity_id))) return false;
    if (patternMatch && !patternMatch(entity)) return false;
    if (deviceClasses) {
      const dc = entity.attributes.device_class as string | undefined;
      if (!dc || !deviceClasses.includes(dc)) return false;
    }
    if (filter.state && entity.state !== filter.state) return false;
    if (areaEntities && !areaEntities.has(entity.entity_id)) return false;
    if (labelEntities && !labelEntities.has(entity.entity_id)) return false;
    return true;
  });
}
