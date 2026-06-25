import { useCallback, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import {
  ActionButton,
  AlarmPanel,
  BinaryBadge,
  CameraTile,
  ClimateCard,
  CounterCard,
  CoverCard,
  EntityRow,
  FanCard,
  Gauge,
  LightTile,
  LockCard,
  MediaPlayerCard,
  NumberSlider,
  PersonChip,
  SceneButton,
  ScriptButton,
  SelectCard,
  Stat,
  TimerCard,
  VacuumCard,
  WeatherCard,
} from '../components/widgets';
import { useEntity } from '../hass/hooks';
import { hassStore } from '../hass/store';
import type { HassEntity } from '../hass/types';
import { WIDGET_IMPORTS } from '../lib/entityWidgets';

export type WidgetCatalogEntry = {
  name: string;
  label: string;
  domains: string[];
  snippet: (entityId: string) => string;
  Component: ComponentType<{ entityId: string }>;
};

function StatPreview({ entityId }: { entityId: string }) {
  const e = useEntity(entityId);
  return (
    <Stat
      label={(e?.attributes.friendly_name as string) ?? entityId.split('.')[1] ?? 'Stat'}
      value={e?.state ?? '—'}
      unit={e?.attributes.unit_of_measurement as string | undefined}
    />
  );
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'Stat',
    label: 'Stat',
    domains: ['sensor'],
    snippet: (id) => `<Stat label="${id.split('.')[1] ?? 'Sensor'}" value={useEntity('${id}')?.state ?? '—'} />`,
    Component: StatPreview,
  },
  {
    name: 'Gauge',
    label: 'Gauge',
    domains: ['sensor'],
    snippet: (id) => `<Gauge entityId="${id}" />`,
    Component: Gauge,
  },
  {
    name: 'EntityRow',
    label: 'Entity-Zeile',
    domains: ['switch', 'input_boolean'],
    snippet: (id) => `<EntityRow entityId="${id}" />`,
    Component: EntityRow,
  },
  {
    name: 'BinaryBadge',
    label: 'Binary',
    domains: ['binary_sensor'],
    snippet: (id) => `<BinaryBadge entityId="${id}" />`,
    Component: BinaryBadge,
  },
  {
    name: 'LightTile',
    label: 'Licht',
    domains: ['light'],
    snippet: (id) => `<LightTile entityId="${id}" />`,
    Component: LightTile,
  },
  {
    name: 'ClimateCard',
    label: 'Klima',
    domains: ['climate'],
    snippet: (id) => `<ClimateCard entityId="${id}" />`,
    Component: ClimateCard,
  },
  {
    name: 'CoverCard',
    label: 'Rollo',
    domains: ['cover'],
    snippet: (id) => `<CoverCard entityId="${id}" />`,
    Component: CoverCard,
  },
  {
    name: 'MediaPlayerCard',
    label: 'Media',
    domains: ['media_player'],
    snippet: (id) => `<MediaPlayerCard entityId="${id}" />`,
    Component: MediaPlayerCard,
  },
  {
    name: 'WeatherCard',
    label: 'Wetter',
    domains: ['weather'],
    snippet: (id) => `<WeatherCard entityId="${id}" />`,
    Component: WeatherCard,
  },
  {
    name: 'PersonChip',
    label: 'Person',
    domains: ['person', 'device_tracker'],
    snippet: (id) => `<PersonChip entityId="${id}" />`,
    Component: PersonChip,
  },
  {
    name: 'NumberSlider',
    label: 'Zahl',
    domains: ['input_number'],
    snippet: (id) => `<NumberSlider entityId="${id}" />`,
    Component: NumberSlider,
  },
  {
    name: 'ActionButton',
    label: 'Aktion',
    domains: ['script', 'scene', 'button'],
    snippet: (id) => `<ActionButton entityId="${id}" />`,
    Component: ActionButton,
  },
  {
    name: 'SelectCard',
    label: 'Auswahl',
    domains: ['input_select', 'select'],
    snippet: (id) => `<SelectCard entityId="${id}" />`,
    Component: SelectCard,
  },
  {
    name: 'LockCard',
    label: 'Schloss',
    domains: ['lock'],
    snippet: (id) => `<LockCard entityId="${id}" />`,
    Component: LockCard,
  },
  {
    name: 'VacuumCard',
    label: 'Staubsauger',
    domains: ['vacuum'],
    snippet: (id) => `<VacuumCard entityId="${id}" />`,
    Component: VacuumCard,
  },
  {
    name: 'FanCard',
    label: 'Ventilator',
    domains: ['fan'],
    snippet: (id) => `<FanCard entityId="${id}" />`,
    Component: FanCard,
  },
  {
    name: 'AlarmPanel',
    label: 'Alarm',
    domains: ['alarm_control_panel'],
    snippet: (id) => `<AlarmPanel entityId="${id}" />`,
    Component: AlarmPanel,
  },
  {
    name: 'CameraTile',
    label: 'Kamera',
    domains: ['camera'],
    snippet: (id) => `<CameraTile entityId="${id}" />`,
    Component: CameraTile,
  },
  {
    name: 'TimerCard',
    label: 'Timer',
    domains: ['timer'],
    snippet: (id) => `<TimerCard entityId="${id}" />`,
    Component: TimerCard,
  },
  {
    name: 'CounterCard',
    label: 'Zähler',
    domains: ['counter'],
    snippet: (id) => `<CounterCard entityId="${id}" />`,
    Component: CounterCard,
  },
  {
    name: 'SceneButton',
    label: 'Szene',
    domains: ['scene'],
    snippet: (id) => `<SceneButton entityId="${id}" />`,
    Component: SceneButton,
  },
  {
    name: 'ScriptButton',
    label: 'Skript',
    domains: ['script'],
    snippet: (id) => `<ScriptButton entityId="${id}" />`,
    Component: ScriptButton,
  },
];

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
  const snippet = entityId
    ? entry.snippet(entityId)
    : entry.snippet(`${entry.domains[0]}.beispiel`);
  const Preview = entry.Component;

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
