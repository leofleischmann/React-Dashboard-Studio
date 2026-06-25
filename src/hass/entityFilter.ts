import type { HassEntity } from './types';
import { registryStore } from './registryStore';

export type EntityFilter = {
  /** e.g. "sensor" or ["light", "switch"] */
  domain?: string | string[];
  /** Case-insensitive match against entity_id or friendly_name. */
  pattern?: string;
  /** Match attributes.device_class. */
  deviceClass?: string | string[];
  /** Requires entity registry (loaded automatically). */
  areaId?: string;
  /** Exact state match, e.g. "on". */
  state?: string;
};

function domainOf(entityId: string): string {
  return entityId.split('.')[0] ?? entityId;
}

function matchesPattern(entity: HassEntity, pattern: string): boolean {
  const re = new RegExp(pattern, 'i');
  const name = entity.attributes.friendly_name;
  return re.test(entity.entity_id) || (typeof name === 'string' && re.test(name));
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

  return entities.filter((entity) => {
    if (domains && !domains.includes(domainOf(entity.entity_id))) return false;
    if (filter.pattern && !matchesPattern(entity, filter.pattern)) return false;
    if (deviceClasses) {
      const dc = entity.attributes.device_class as string | undefined;
      if (!dc || !deviceClasses.includes(dc)) return false;
    }
    if (filter.state && entity.state !== filter.state) return false;
    if (areaEntities && !areaEntities.has(entity.entity_id)) return false;
    return true;
  });
}
