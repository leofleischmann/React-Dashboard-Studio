import type { HassEntity } from '../../hass/types';
import type { WidgetCatalogEntry, WidgetCategory } from './types';
import { COMPOSITE_WIDGET_CATALOG } from './composite';
import { DOMAIN_WIDGET_CATALOG } from './domain';
import { FEATURED_WIDGET_CATALOG } from './featured';

export type { WidgetCatalogEntry, WidgetCategory } from './types';

export { DOMAIN_WIDGET_CATALOG } from './domain';
export { FEATURED_WIDGET_CATALOG } from './featured';
export { COMPOSITE_WIDGET_CATALOG } from './composite';
export { pickNumericSensorEntity } from './demos';
export { widgetCatalogNames, widgetImportStatement } from './imports';

/** All registerable widgets — studio gallery & widget reference. */
export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  ...DOMAIN_WIDGET_CATALOG,
  ...FEATURED_WIDGET_CATALOG,
  ...COMPOSITE_WIDGET_CATALOG,
];

export function catalogSnippet(
  entry: WidgetCatalogEntry,
  entityId: string | null,
): string {
  if (typeof entry.snippet === 'function') {
    return entry.snippet(entityId ?? `${entry.domains[0] ?? 'entity'}.beispiel`);
  }
  return entry.snippet;
}

export function catalogSnippetDisplay(entry: WidgetCatalogEntry): string {
  return typeof entry.snippet === 'string' ? entry.snippet : `<${entry.name} … />`;
}

/** Entity-Inserter: domain → default widget name (from catalog `inserterDefault`). */
export function widgetNameForDomain(domain: string): string {
  const featured = FEATURED_WIDGET_CATALOG.find(
    (e) => e.inserterDefault && e.domains.includes(domain),
  );
  if (featured) return featured.name;

  const domainEntry = DOMAIN_WIDGET_CATALOG.find(
    (e) => e.inserterDefault && e.domains.includes(domain),
  );
  if (domainEntry) return domainEntry.name;

  const fallback = DOMAIN_WIDGET_CATALOG.find((e) => e.domains.includes(domain));
  return fallback?.name ?? 'EntityRow';
}

export function catalogByCategory(
  category: WidgetCategory,
): WidgetCatalogEntry[] {
  return WIDGET_CATALOG.filter((e) => (e.category ?? 'domain') === category);
}

/** First matching entity id per domain — shared by gallery grids. */
export function buildCatalogExampleMap(
  entities: readonly HassEntity[],
): Map<string, string> {
  const byDomain = new Map<string, string>();
  for (const entry of WIDGET_CATALOG) {
    for (const domain of entry.domains) {
      if (byDomain.has(domain)) continue;
      const match = entities.find((e) => e.entity_id.startsWith(`${domain}.`));
      if (match) byDomain.set(domain, match.entity_id);
    }
  }
  return byDomain;
}

export function resolveCatalogEntityId(
  entry: WidgetCatalogEntry,
  entities: readonly HassEntity[],
  examplesByDomain: Map<string, string>,
): string | undefined {
  return (
    entry.pickExample?.(entities) ??
    entry.domains.map((d) => examplesByDomain.get(d)).find(Boolean)
  );
}

export function canShowCatalogDemo(
  entry: WidgetCatalogEntry,
  entityId: string | undefined,
): boolean {
  return Boolean(entityId || entry.optionalEntity);
}
