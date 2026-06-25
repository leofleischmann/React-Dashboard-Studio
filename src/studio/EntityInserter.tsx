import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { hassStore } from '../hass/store';
import { searchEntities } from '../hass/entitySearch';
import type { HassEntity } from '../hass/types';

type Mode = 'value' | 'action' | 'id';

const LIST_LIMIT = 300;
const ROW_HEIGHT = 52;
const EMPTY_QUERY_LIMIT = 50;

const ACTION_SERVICE: Record<string, string> = {
  light: 'toggle',
  switch: 'toggle',
  fan: 'toggle',
  cover: 'toggle',
  input_boolean: 'toggle',
  media_player: 'media_play_pause',
  script: 'turn_on',
  scene: 'turn_on',
  automation: 'trigger',
  button: 'press',
  lock: 'unlock',
};

function snippetFor(mode: Mode, id: string): string {
  if (mode === 'id') return `'${id}'`;
  if (mode === 'value') return `useEntity('${id}')?.state`;
  const domain = id.split('.')[0];
  const service = ACTION_SERVICE[domain] ?? 'toggle';
  return `callService('${domain}', '${service}', { entity_id: '${id}' })`;
}

function useEntityMatches(query: string): HassEntity[] {
  const cacheRef = useRef<{ q: string; key: string; result: HassEntity[] }>({
    q: '',
    key: '',
    result: [],
  });

  const getSnapshot = useCallback(() => {
    const states = hassStore.getHass()?.states ?? {};
    const q = query.trim();
    const limit = q ? LIST_LIMIT : EMPTY_QUERY_LIMIT;
    const next = searchEntities(states, q, limit);
    const key = next.map((e) => `${e.entity_id}:${e.state}`).join('|');
    const prev = cacheRef.current;
    if (prev.q === q && prev.key === key) {
      return prev.result;
    }
    cacheRef.current = { q, key, result: next };
    return next;
  }, [query]);

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
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useEntityMatches(query);
  const hasQuery = query.trim().length > 0;

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

      <div
        className="rd-inserter__preview"
        title={snippetFor(mode, 'sensor.beispiel')}
      >
        {snippetFor(mode, 'sensor.beispiel')}
      </div>

      {!hasQuery && (
        <p className="rd-inserter__hint">
          Suchbegriff eingeben — es werden die ersten {EMPTY_QUERY_LIMIT} Entities
          angezeigt.
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
