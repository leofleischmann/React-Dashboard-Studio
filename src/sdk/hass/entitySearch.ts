import type { HassEntity } from './types';

const ENTITY_ID_RE = /^[\w.]+$/;

/** Returns true when the cursor sits inside a string literal used as an entity ID. */
export function isEntityIdContext(linePrefix: string): boolean {
  return (
    /useEntity(?:State)?\(\s*['"]?$/.test(linePrefix) ||
    /entity_id:\s*['"]?$/.test(linePrefix) ||
    /\b(?:powerId|kwhId|costId|switchId|entityId|lightId|sensorKey)=\s*['"]?$/.test(
      linePrefix,
    )
  );
}

/**
 * Lazily search entities — optional domain filter, sorted by friendly name.
 */
export function searchEntities(
  states: Record<string, HassEntity>,
  query: string,
  limit = 50,
  domain?: string,
): HassEntity[] {
  const q = query.trim().toLowerCase();
  const results: HassEntity[] = [];
  const scanCap = Math.max(limit, 400);

  for (const id in states) {
    if (domain && !id.startsWith(`${domain}.`)) continue;
    const entity = states[id];
    if (
      q &&
      !id.toLowerCase().includes(q) &&
      !(entity.attributes.friendly_name ?? '').toLowerCase().includes(q)
    ) {
      continue;
    }
    results.push(entity);
    if (results.length >= scanCap) break;
  }

  results.sort((a, b) =>
    (a.attributes.friendly_name ?? a.entity_id).localeCompare(
      b.attributes.friendly_name ?? b.entity_id,
      'de',
    ),
  );
  return results.slice(0, limit);
}

export { ENTITY_ID_RE };
