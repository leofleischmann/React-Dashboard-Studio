import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { hassStore } from '../sdk/hass/store';
import type { HassEntity } from '../sdk/hass/types';
import {
  WIDGET_CATALOG,
  buildCatalogExampleMap,
  canShowCatalogDemo,
  catalogSnippet,
  catalogSource,
  resolveCatalogEntityId,
  type WidgetCatalogEntry,
} from '../sdk/ui/catalog';
import { WIDGET_IMPORTS } from '../lib/entityWidgets';

function GalleryCard({
  entry,
  entityId,
  onPick,
  copied,
  pickLabel,
}: {
  entry: WidgetCatalogEntry;
  entityId: string | undefined;
  onPick: (snippet: string, key: string) => void;
  copied: boolean;
  pickLabel: string;
}) {
  const snippet = catalogSnippet(entry, entityId ?? null);
  const source = catalogSource(entry, entityId ?? null);
  const Preview = entry.Demo;
  const canPreview = canShowCatalogDemo(entry, entityId);

  return (
    <div className={`rd-widget-gallery__card ${copied ? 'is-copied' : ''}`}>
      <span className="rd-widget-gallery__name">{entry.label}</span>
      <div className="rd-widget-gallery__preview">
        {canPreview ? (
          <Preview entityId={entityId ?? ''} />
        ) : (
          <span className="rd-widget-gallery__missing">
            Kein {entry.domains.join('/') || 'Beispiel'} in HA
          </span>
        )}
      </div>
      <code className="rd-widget-gallery__snippet">{snippet}</code>
      <div className="rd-widget-gallery__actions">
        <button
          type="button"
          className="rd-widget-gallery__act"
          onClick={() => onPick(snippet, entry.name)}
          title={`${pickLabel}: ${snippet}`}
        >
          {pickLabel}
        </button>
        {source && (
          <button
            type="button"
            className="rd-widget-gallery__act rd-widget-gallery__act--ghost"
            onClick={() => onPick(source, entry.name)}
            title="Bearbeitbare Kopie des Widgets — volle Design-Freiheit"
          >
            ⟨⟩ Quelltext
          </button>
        )}
        {copied && <span className="rd-widget-gallery__copied">✓</span>}
      </div>
    </div>
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
  const states = useSyncExternalStore(hassStore.subscribeAllEntities, getSnapshot, () => ({}));
  const entities = useMemo(() => Object.values(states) as HassEntity[], [states]);
  const examples = useMemo(() => buildCatalogExampleMap(entities), [entities]);

  return (
    <div className="rd-widget-gallery">
      <p className="rd-inserter__hint">
        Live-Vorschau mit deinen HA-Entities · Klick {copyToClipboard ? 'kopiert' : 'fügt ein'} ·
        {' '}<strong>⟨⟩ Quelltext</strong> {copyToClipboard ? 'kopiert' : 'fügt'} eine frei
        bearbeitbare Kopie {copyToClipboard ? '' : 'ein '}statt eines Imports
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
            entityId={resolveCatalogEntityId(entry, entities, examples)}
            onPick={onPick}
            copied={copiedKey === entry.name}
            pickLabel={pickLabel}
          />
        ))}
      </div>
    </div>
  );
}

export { WIDGET_CATALOG, type WidgetCatalogEntry } from '../sdk/ui/catalog';
