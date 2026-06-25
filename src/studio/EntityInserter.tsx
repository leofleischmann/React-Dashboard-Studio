import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { hassStore } from '../hass/store';
import { searchEntities } from '../hass/entitySearch';
import {
  entityActionSnippet,
  entityDomain,
  entityIdSnippet,
  entityValueSnippet,
} from '../lib/entityActions';
import type { HassEntity } from '../hass/types';

type Mode = 'value' | 'action' | 'id';

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
] as const;

function snippetFor(mode: Mode, id: string): string {
  if (mode === 'id') return entityIdSnippet(id);
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

  return useSyncExternalStore(hassStore.subscribe, getSnapshot, () => []);
}

function EntityRow({
  entity,
  mode,
  onInsert,
}: {
  entity: HassEntity;
  mode: Mode;
  onInsert: (snippet: string) => void;
}) {
  const snippet = snippetFor(mode, entity.entity_id);
  const unit = entity.attributes.unit_of_measurement;

  return (
    <div
      className="rd-inserter__item"
      onClick={() => onInsert(snippet)}
      title={`Einfügen: ${snippet}`}
    >
      <span className="rd-inserter__name">
        {entity.attributes.friendly_name ?? entity.entity_id}
      </span>
      <span className="rd-inserter__id">{entity.entity_id}</span>
      <span className="rd-inserter__state">
        {entity.state}
        {unit ? ` ${unit}` : ''}
        {mode === 'action' && (
          <small className="rd-inserter__svc"> · {entityDomain(entity.entity_id)}</small>
        )}
      </span>
    </div>
  );
}

export function EntityInserter({
  onInsert,
  onClose,
}: {
  onInsert: (snippet: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('value');
  const [domain, setDomain] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useEntityMatches(query, domain);
  const hasQuery = query.trim().length > 0;
  const exampleId =
    domain === 'light'
      ? 'light.wohnzimmer'
      : domain === 'sensor'
        ? 'sensor.temperatur'
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
    <div className="rd-inserter">
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
            ['action', 'Aktion'],
            ['id', 'nur ID'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            className={`rd-inserter__mode ${mode === m ? 'is-active' : ''}`}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

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

      {!hasQuery && !domain && (
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
                  <EntityRow entity={entity} mode={mode} onInsert={onInsert} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
