import type { WidgetCatalogEntry, WidgetCategory } from './types';
import { COMPOSITE_WIDGET_CATALOG } from './composite';
import { DOMAIN_WIDGET_CATALOG } from './domain';
import { FEATURED_WIDGET_CATALOG } from './featured';

export type { WidgetCatalogEntry, WidgetCategory } from './types';

export { DOMAIN_WIDGET_CATALOG } from './domain';
export { FEATURED_WIDGET_CATALOG } from './featured';
export { COMPOSITE_WIDGET_CATALOG } from './composite';
export { pickNumericSensorEntity } from './demos';

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
