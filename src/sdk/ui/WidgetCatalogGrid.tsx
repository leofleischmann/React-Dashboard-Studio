import type { ReactNode } from 'react';
import { useEntitiesByDomain } from '../hass/hooks';
import { ResponsiveGrid } from './layout';
import {
  WIDGET_CATALOG,
  catalogSnippetDisplay,
  type WidgetCatalogEntry,
} from './widgetCatalog';

function RefCard({
  entry,
  children,
}: {
  entry: WidgetCatalogEntry;
  children: (entityId: string) => ReactNode;
}) {
  const domain = entry.domains[0];
  const entity = useEntitiesByDomain(domain)[0];

  return (
    <article className="rd-card rd-sdk-ref-card">
      <header className="rd-sdk-ref-card__head">
        <strong>{entry.label}</strong>
        <code>{catalogSnippetDisplay(entry)}</code>
      </header>
      {entity ? (
        children(entity.entity_id)
      ) : (
        <p className="rd-empty">Kein {domain}.* gefunden</p>
      )}
    </article>
  );
}

/** Live widget grid for SDK reference dashboards (@ha/ui). */
export function WidgetCatalogGrid() {
  return (
    <ResponsiveGrid min={260}>
      {WIDGET_CATALOG.map((entry) => {
        const Demo = entry.Demo;
        return (
          <RefCard key={entry.name} entry={entry}>
            {(entityId) => <Demo entityId={entityId} />}
          </RefCard>
        );
      })}
    </ResponsiveGrid>
  );
}

export { WIDGET_CATALOG, catalogSnippet, catalogSnippetDisplay } from './widgetCatalog';
export type { WidgetCatalogEntry } from './widgetCatalog';
