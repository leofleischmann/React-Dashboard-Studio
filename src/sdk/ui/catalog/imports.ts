import { COMPOSITE_WIDGET_CATALOG } from './composite';
import { DOMAIN_WIDGET_CATALOG } from './domain';
import { FEATURED_WIDGET_CATALOG } from './featured';

const ALL_CATALOG_ENTRIES = [
  ...DOMAIN_WIDGET_CATALOG,
  ...FEATURED_WIDGET_CATALOG,
  ...COMPOSITE_WIDGET_CATALOG,
];

/** Unique widget component names from the catalog (sorted). */
export function widgetCatalogNames(): string[] {
  return [...new Set(ALL_CATALOG_ENTRIES.map((e) => e.name))].sort();
}

/** Suggested import line for widget gallery / entity inserter hints. */
export function widgetImportStatement(): string {
  return `import { ${widgetCatalogNames().join(', ')} } from '@ha/ui';`;
}
