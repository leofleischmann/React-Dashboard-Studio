import { memo, useMemo, type ReactNode } from 'react';
import { useEntities } from '../hass/hooks';
import type { HassEntity } from '../hass/types';
import { ResponsiveGrid } from './layout';
import {
  WIDGET_CATALOG,
  catalogSnippetDisplay,
  catalogByCategory,
  type WidgetCatalogEntry,
  type WidgetCategory,
} from './catalog';

function buildExampleMap(entities: readonly HassEntity[]): Map<string, string> {
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
  const canDemo = entityId || entry.optionalEntity;
  return (
    <article className="rd-card rd-sdk-ref-card">
      <header className="rd-sdk-ref-card__head">
        <strong>{entry.label}</strong>
        <code>{catalogSnippetDisplay(entry)}</code>
      </header>
      {canDemo ? (
        children(entityId ?? '')
      ) : (
        <p className="rd-empty">Kein {domain}.* gefunden</p>
      )}
    </article>
  );
});

/** Live widget grid for SDK reference dashboards (@ha/ui). */
export function WidgetCatalogGrid({
  categories,
}: {
  categories?: WidgetCategory[];
} = {}) {
  const entities = useEntities();
  const examples = useMemo(() => buildExampleMap(entities), [entities]);
  const entries = categories?.length
    ? categories.flatMap((c) => catalogByCategory(c))
    : WIDGET_CATALOG;

  return (
    <ResponsiveGrid min={260}>
      {entries.map((entry) => {
        const Demo = entry.Demo;
        const entityId =
          entry.pickExample?.(entities) ??
          entry.domains.map((d) => examples.get(d)).find(Boolean);
        return (
          <RefCard key={entry.name} entry={entry} entityId={entityId}>
            {(id) => <Demo entityId={id} />}
          </RefCard>
        );
      })}
    </ResponsiveGrid>
  );
}

export {
  WIDGET_CATALOG,
  catalogSnippet,
  catalogSnippetDisplay,
  catalogByCategory,
  widgetNameForDomain,
} from './catalog';
export type { WidgetCatalogEntry, WidgetCategory } from './catalog';
