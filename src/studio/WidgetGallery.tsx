import { useCallback, useSyncExternalStore } from 'react';
import { hassStore } from '../sdk/hass/store';
import type { HassEntity } from '../sdk/hass/types';
import {
  WIDGET_CATALOG,
  catalogSnippet,
  type WidgetCatalogEntry,
} from '../sdk/ui/widgetCatalog';
import { WIDGET_IMPORTS } from '../lib/entityWidgets';

function findExampleEntity(domains: string[], states: Record<string, HassEntity>): string | null {
  for (const domain of domains) {
    const match = Object.values(states).find((e) => e.entity_id.startsWith(`${domain}.`));
    if (match) return match.entity_id;
  }
  return null;
}

function GalleryCard({
  entry,
  entityId,
  onPick,
  copied,
  pickLabel,
}: {
  entry: WidgetCatalogEntry;
  entityId: string | null;
  onPick: (snippet: string, key: string) => void;
  copied: boolean;
  pickLabel: string;
}) {
  const snippet = catalogSnippet(entry, entityId);
  const Preview = entry.Demo;

  return (
    <button
      type="button"
      className={`rd-widget-gallery__card ${copied ? 'is-copied' : ''}`}
      onClick={() => onPick(snippet, entry.name)}
      title={`${pickLabel}: ${snippet}`}
    >
      <span className="rd-widget-gallery__name">{entry.label}</span>
      <div className="rd-widget-gallery__preview">
        {entityId ? (
          <Preview entityId={entityId} />
        ) : (
          <span className="rd-widget-gallery__missing">
            Kein {entry.domains.join('/')} in HA
          </span>
        )}
      </div>
      <code className="rd-widget-gallery__snippet">{snippet}</code>
      {copied && <span className="rd-widget-gallery__copied">Kopiert</span>}
    </button>
  );
}

export function WidgetGallery({
  onPick,
  copiedKey,
  pickLabel,
  copyToClipboard,
}: {
  onPick: (snippet: string, key: string) => void;
  copiedKey: string | null;
  pickLabel: string;
  copyToClipboard: boolean;
}) {
  const getSnapshot = useCallback(() => hassStore.getHass()?.states ?? {}, []);
  const states = useSyncExternalStore(hassStore.subscribe, getSnapshot, () => ({}));

  return (
    <div className="rd-widget-gallery">
      <p className="rd-inserter__hint">
        Live-Vorschau mit deinen HA-Entities · Klick {copyToClipboard ? 'kopiert' : 'fügt ein'}
        {!copyToClipboard && (
          <>
            {' '}
            — ggf. <code>{WIDGET_IMPORTS}</code>
          </>
        )}
      </p>
      <div className="rd-widget-gallery__grid">
        {WIDGET_CATALOG.map((entry) => (
          <GalleryCard
            key={entry.name}
            entry={entry}
            entityId={findExampleEntity(entry.domains, states)}
            onPick={onPick}
            copied={copiedKey === entry.name}
            pickLabel={pickLabel}
          />
        ))}
      </div>
    </div>
  );
}

export { WIDGET_CATALOG, type WidgetCatalogEntry } from '../sdk/ui/widgetCatalog';
