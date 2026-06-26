import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { hassStore } from '../sdk/hass/store';
import type { HassEntity } from '../sdk/hass/types';
import {
  WIDGET_CATALOG,
  buildCatalogExampleMap,
  canShowCatalogDemo,
  catalogSnippet,
  resolveCatalogEntityId,
  type WidgetCatalogEntry,
} from '../sdk/ui/catalog';
import { ejectForWidgetName, type EjectInsert } from './ejectInsert';

function GalleryCard({
  entry,
  entityId,
  onEject,
  copied,
  pickLabel,
}: {
  entry: WidgetCatalogEntry;
  entityId: string | undefined;
  onEject: (eject: EjectInsert | null, key: string) => void;
  copied: boolean;
  pickLabel: string;
}) {
  const usage = catalogSnippet(entry, entityId ?? null);
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
      <code className="rd-widget-gallery__snippet">{usage}</code>
      <div className="rd-widget-gallery__actions">
        <button
          type="button"
          className="rd-widget-gallery__act"
          onClick={() => onEject(ejectForWidgetName(entry.name, entityId ?? null), entry.name)}
          title="Quelltext ins Dashboard kopieren (eingeklappt, frei bearbeitbar)"
        >
          {pickLabel}
        </button>
        {copied && <span className="rd-widget-gallery__copied">✓</span>}
      </div>
    </div>
  );
}

export function WidgetGallery({
  onEject,
  copiedKey,
  pickLabel,
  copyToClipboard,
}: {
  onEject: (eject: EjectInsert | null, key: string) => void;
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
        Live-Vorschau mit deinen HA-Entities · Klick {copyToClipboard ? 'kopiert' : 'fügt'} den
        Widget-Code {copyToClipboard ? '' : 'eingeklappt '}in dein Dashboard — editierbar, kein
        Import, kein Black-Box-Abhängigkeit.
      </p>
      <div className="rd-widget-gallery__grid">
        {WIDGET_CATALOG.map((entry) => (
          <GalleryCard
            key={entry.name}
            entry={entry}
            entityId={resolveCatalogEntityId(entry, entities, examples)}
            onEject={onEject}
            copied={copiedKey === entry.name}
            pickLabel={pickLabel}
          />
        ))}
      </div>
    </div>
  );
}

export { WIDGET_CATALOG, type WidgetCatalogEntry } from '../sdk/ui/catalog';
