import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { hassStore } from '../sdk/hass/store';
import { searchEntities } from '../sdk/hass/entitySearch';
import {
  entityActionSnippet,
  entityDomain,
  entityIdSnippet,
  entityTemplateSnippet,
  entityValueSnippet,
} from '../sdk/entityActions';
import { entityWidgetSnippet, widgetForDomain } from '../lib/entityWidgets';
import type { HassEntity } from '../sdk/hass/types';

import { WidgetGallery } from './WidgetGallery';

type Mode = 'value' | 'template' | 'action' | 'id' | 'widget';
type WidgetView = 'list' | 'gallery';

const LIST_LIMIT = 300;
const ROW_HEIGHT = 52;
const EMPTY_QUERY_LIMIT = 80;

const DOMAIN_FILTERS = [
  ['', 'Alle'],
  ['sensor', 'Sensor'],
  ['binary_sensor', 'Binary'],
  ['light', 'Licht'],
  ['switch', 'Schalter'],
  ['climate', 'Klima'],
  ['cover', 'Rollo'],
  ['media_player', 'Media'],
  ['script', 'Script'],
  ['scene', 'Szene'],
  ['button', 'Button'],
  ['weather', 'Wetter'],
  ['person', 'Person'],
  ['input_number', 'Zahl'],
] as const;

function snippetFor(mode: Mode, id: string): string {
  if (mode === 'widget') return entityWidgetSnippet(id);
  if (mode === 'id') return entityIdSnippet(id);
  if (mode === 'template') return entityTemplateSnippet(id);
  if (mode === 'value') return entityValueSnippet(id);
  return entityActionSnippet(id);
}

function useEntityMatches(query: string, domain: string): HassEntity[] {
  const cacheRef = useRef<{ q: string; d: string; key: string; result: HassEntity[] }>({
    q: '',
    d: '',
    key: '',
    result: [],
  });

  const getSnapshot = useCallback(() => {
    const states = hassStore.getHass()?.states ?? {};
    const q = query.trim();
    const limit = q || domain ? LIST_LIMIT : EMPTY_QUERY_LIMIT;
    const next = searchEntities(states, q, limit, domain || undefined);
    const key = next.map((e) => `${e.entity_id}:${e.state}`).join('|');
    const prev = cacheRef.current;
    if (prev.q === q && prev.d === domain && prev.key === key) {
      return prev.result;
    }
    cacheRef.current = { q, d: domain, key, result: next };
    return next;
  }, [query, domain]);

  return useSyncExternalStore(hassStore.subscribeAllEntities, getSnapshot, () => []);
}

function EntityRow({
  entity,
  mode,
  onPick,
  copied,
  pickLabel,
}: {
  entity: HassEntity;
  mode: Mode;
  onPick: (snippet: string) => void;
  copied?: boolean;
  pickLabel: string;
}) {
  const snippet = snippetFor(mode, entity.entity_id);
  const unit = entity.attributes.unit_of_measurement;

  return (
    <div
      className={`rd-inserter__item ${copied ? 'is-copied' : ''}`}
      onClick={() => onPick(snippet)}
      title={`${pickLabel}: ${snippet}`}
    >
      <span className="rd-inserter__name">
        {entity.attributes.friendly_name ?? entity.entity_id}
      </span>
      <span className="rd-inserter__id">{entity.entity_id}</span>
      <span className="rd-inserter__state">
        {entity.state}
        {unit ? ` ${unit}` : ''}
        {copied && <small className="rd-inserter__copied"> · Kopiert</small>}
        {mode === 'action' && (
          <small className="rd-inserter__svc"> · {entityDomain(entity.entity_id)}</small>
        )}
        {mode === 'widget' && (
          <small className="rd-inserter__svc"> · {widgetForDomain(entityDomain(entity.entity_id))}</small>
        )}
      </span>
    </div>
  );
}

export function EntityInserter({
  onInsert,
  onClose,
  copyToClipboard = false,
  className = '',
}: {
  onInsert?: (snippet: string) => void;
  onClose: () => void;
  /** Dev preview: copy snippet to clipboard instead of inserting into the editor. */
  copyToClipboard?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('value');
  const [widgetView, setWidgetView] = useState<WidgetView>('list');
  const [domain, setDomain] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGalleryKey, setCopiedGalleryKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickLabel = copyToClipboard ? 'Kopieren' : 'Einfügen';

  const handlePick = useCallback(
    (snippet: string, key: string) => {
      if (copyToClipboard) {
        void navigator.clipboard.writeText(snippet).catch(() => {
          window.prompt('Snippet manuell kopieren:', snippet);
        });
        if (key.includes('.')) {
          setCopiedId(key);
          setCopiedGalleryKey(null);
        } else {
          setCopiedGalleryKey(key);
          setCopiedId(null);
        }
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => {
          setCopiedId(null);
          setCopiedGalleryKey(null);
        }, 1600);
        return;
      }
      onInsert?.(snippet);
    },
    [copyToClipboard, onInsert],
  );

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const matches = useEntityMatches(query, domain);
  const hasQuery = query.trim().length > 0;
  const exampleId =
    domain === 'light'
      ? 'light.wohnzimmer'
      : domain === 'sensor'
        ? 'sensor.temperatur'
        : domain === 'weather'
          ? 'weather.home'
          : domain === 'media_player'
            ? 'media_player.wohnzimmer'
            : domain
              ? `${domain}.beispiel`
              : 'sensor.beispiel';

  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [matches.length]); // virtualizer is stable enough; remeasure when result count changes

  return (
    <div className={`rd-inserter ${copyToClipboard ? 'rd-inserter--clipboard' : ''} ${className}`.trim()}>
      <div className="rd-inserter__head">
        <input
          className="rd-inserter__search"
          autoFocus
          placeholder="Sensor / Gerät suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="rd-inserter__close" onClick={onClose} title="Schließen">
          ✕
        </button>
      </div>

      <div className="rd-inserter__modes">
        <span>Einfügen als:</span>
        {(
          [
            ['value', 'Wert'],
            ['template', 'Template'],
            ['action', 'Aktion'],
            ['id', 'nur ID'],
            ['widget', 'Widget'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            className={`rd-inserter__mode ${mode === m ? 'is-active' : ''}`}
            onClick={() => {
              setMode(m);
              if (m !== 'widget') setWidgetView('list');
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'widget' && (
        <div className="rd-inserter__widget-views">
          <button
            type="button"
            className={`rd-inserter__mode ${widgetView === 'list' ? 'is-active' : ''}`}
            onClick={() => setWidgetView('list')}
          >
            Entities
          </button>
          <button
            type="button"
            className={`rd-inserter__mode ${widgetView === 'gallery' ? 'is-active' : ''}`}
            onClick={() => setWidgetView('gallery')}
          >
            Galerie
          </button>
        </div>
      )}

      {mode === 'widget' && widgetView === 'gallery' ? (
        <WidgetGallery
          copyToClipboard={copyToClipboard}
          copiedKey={copiedGalleryKey}
          pickLabel={pickLabel}
          onPick={handlePick}
        />
      ) : (
        <>
      <div className="rd-inserter__domains">
        {DOMAIN_FILTERS.map(([value, label]) => (
          <button
            key={value || 'all'}
            className={`rd-inserter__domain ${domain === value ? 'is-active' : ''}`}
            onClick={() => setDomain(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rd-inserter__preview-wrap">
        <span className="rd-inserter__preview-label">Beispiel:</span>
        <div
          className="rd-inserter__preview"
          title={snippetFor(mode, exampleId)}
        >
          {snippetFor(mode, exampleId)}
        </div>
      </div>

      {copyToClipboard && (
        <p className="rd-inserter__hint">
          Klick kopiert das Snippet — in VS Code einfügen (Strg/⌘ + V).
        </p>
      )}

      {mode === 'widget' && !copyToClipboard && (
        <p className="rd-inserter__hint">
          Fügt JSX ein — ggf.{' '}
          <code>{`import { … } from '@ha/ui'`}</code> ergänzen.
        </p>
      )}

      {!hasQuery && !domain && mode !== 'widget' && (
        <p className="rd-inserter__hint">
          Suchbegriff oder Domain wählen — es werden die ersten {EMPTY_QUERY_LIMIT}{' '}
          Entities angezeigt.
        </p>
      )}

      <div ref={listRef} className="rd-inserter__list">
        {matches.length === 0 ? (
          <p className="rd-inserter__empty">Nichts gefunden.</p>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const entity = matches[row.index];
              return (
                <div
                  key={entity.entity_id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: row.size,
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  <EntityRow
                    entity={entity}
                    mode={mode}
                    onPick={(snippet) => handlePick(snippet, entity.entity_id)}
                    copied={copiedId === entity.entity_id}
                    pickLabel={pickLabel}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
