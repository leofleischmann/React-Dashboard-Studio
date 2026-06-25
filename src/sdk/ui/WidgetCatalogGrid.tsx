import { memo, useMemo, type ReactNode } from 'react';
import { useEntities } from '../hass/hooks';
import { ResponsiveGrid } from './layout';
import {
  WIDGET_CATALOG,
  buildCatalogExampleMap,
  canShowCatalogDemo,
  catalogSnippetDisplay,
  catalogByCategory,
  resolveCatalogEntityId,
  type WidgetCatalogEntry,
  type WidgetCategory,
} from './catalog';

const RefCard = memo(function RefCard({
  entry,
  entityId,
  children,
}: {
  entry: WidgetCatalogEntry;
  entityId: string | undefined;
  children: (entityId: string) => ReactNode;
}) {
  const domain = entry.domains[0];
  return (
    <article className="rd-card rd-widget-catalog-card">
      <header className="rd-widget-catalog-card__head">
        <strong>{entry.label}</strong>
        <code>{catalogSnippetDisplay(entry)}</code>
      </header>
      {canShowCatalogDemo(entry, entityId) ? (
        children(entityId ?? '')
      ) : (
        <p className="rd-empty">Kein {domain}.* gefunden</p>
      )}
    </article>
  );
});

/** Live widget grid for reference pages and custom dashboards (@ha/ui). */
export function WidgetCatalogGrid({
  categories,
}: {
  categories?: WidgetCategory[];
} = {}) {
  const entities = useEntities();
  const examples = useMemo(() => buildCatalogExampleMap(entities), [entities]);
  const entries = categories?.length
    ? categories.flatMap((c) => catalogByCategory(c))
    : WIDGET_CATALOG;

  return (
    <ResponsiveGrid min={260}>
      {entries.map((entry) => {
        const Demo = entry.Demo;
        const entityId = resolveCatalogEntityId(entry, entities, examples);
        return (
          <RefCard key={entry.name} entry={entry} entityId={entityId}>
            {(id) => <Demo entityId={id} />}
          </RefCard>
        );
      })}
    </ResponsiveGrid>
  );
}
