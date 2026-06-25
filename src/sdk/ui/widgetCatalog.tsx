import type { ComponentType } from 'react';
import { useEntity, useEntityHistory, useEntityHistoryPending } from '../hass/hooks';
import type { HassEntity } from '../hass/types';
import { entityDisplayName, num } from '../format';
import {
  ActionButton,
  AlarmPanel,
  BinaryBadge,
  CalendarCard,
  CameraTile,
  ClimateCard,
  CounterCard,
  CoverCard,
  DeviceTrackerChip,
  EntityRow,
  FanCard,
  Gauge,
  HumidifierCard,
  InputBooleanTile,
  LightTile,
  LockCard,
  MediaPlayerCard,
  NumberSlider,
  PersonChip,
  SceneButton,
  ScriptButton,
  SelectCard,
  SirenCard,
  SparkChart,
  Stat,
  TimerCard,
  UpdateCard,
  VacuumCard,
  ValveCard,
  WaterHeaterCard,
  WeatherCard,
} from './widgets';

export type WidgetCatalogEntry = {
  name: string;
  label: string;
  domains: string[];
  snippet: string | ((entityId: string) => string);
  Demo: ComponentType<{ entityId: string }>;
  /** Prefer a specific entity for the live demo (e.g. numeric sensors for charts). */
  pickExample?: (entities: readonly HassEntity[]) => string | undefined;
};

/** First sensor with a parseable numeric state — for SparkChart demos. */
export function pickNumericSensorEntity(
  entities: readonly HassEntity[],
): string | undefined {
  const numeric = entities.filter(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      !Number.isNaN(Number.parseFloat(e.state)) &&
      e.state !== 'unavailable' &&
      e.state !== 'unknown',
  );
  const temp = numeric.filter((e) => e.attributes.device_class === 'temperature');
  return (temp[0] ?? numeric[0])?.entity_id;
}

function StatDemo({ entityId }: { entityId: string }) {
  const e = useEntity(entityId);
  return (
    <Stat
      label={entityDisplayName(e, entityId)}
      value={num(e?.state)}
      unit={e?.attributes.unit_of_measurement as string | undefined}
    />
  );
}

function SparkDemo({ entityId }: { entityId: string }) {
  const history = useEntityHistory([entityId], { hours: 24 });
  const loading = useEntityHistoryPending([entityId], { hours: 24 });
  return (
    <SparkChart
      loading={loading}
      emptyLabel="Kein numerischer Verlauf für diese Entity"
      series={[
        {
          label: entityId.split('.')[1] ?? 'Verlauf',
          color: '#6ea8fe',
          points: history[entityId] ?? [],
        },
      ]}
    />
  );
}

function CameraDemo({ entityId }: { entityId: string }) {
  return <CameraTile entityId={entityId} refreshSec={30} />;
}

/** Single source of truth for widget reference + studio gallery. */
export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'Stat',
    label: 'Stat',
    domains: ['sensor'],
    snippet: (id) =>
      `<Stat label="${id.split('.')[1] ?? 'Sensor'}" value={num(useEntity('${id}')?.state)} />`,
    Demo: StatDemo,
  },
  {
    name: 'Gauge',
    label: 'Gauge',
    domains: ['sensor'],
    snippet: (id) => `<Gauge entityId="${id}" />`,
    Demo: Gauge,
  },
  {
    name: 'SparkChart',
    label: 'SparkChart',
    domains: ['sensor'],
    pickExample: pickNumericSensorEntity,
    snippet: '<SparkChart series={[…]} />',
    Demo: SparkDemo,
  },
  {
    name: 'EntityRow',
    label: 'Entity-Zeile',
    domains: ['switch'],
    snippet: (id) => `<EntityRow entityId="${id}" />`,
    Demo: EntityRow,
  },
  {
    name: 'BinaryBadge',
    label: 'Binary',
    domains: ['binary_sensor'],
    snippet: (id) => `<BinaryBadge entityId="${id}" />`,
    Demo: BinaryBadge,
  },
  {
    name: 'LightTile',
    label: 'Licht',
    domains: ['light'],
    snippet: (id) => `<LightTile entityId="${id}" />`,
    Demo: LightTile,
  },
  {
    name: 'ClimateCard',
    label: 'Klima',
    domains: ['climate'],
    snippet: (id) => `<ClimateCard entityId="${id}" />`,
    Demo: ClimateCard,
  },
  {
    name: 'CoverCard',
    label: 'Rollo',
    domains: ['cover'],
    snippet: (id) => `<CoverCard entityId="${id}" />`,
    Demo: CoverCard,
  },
  {
    name: 'MediaPlayerCard',
    label: 'Media',
    domains: ['media_player'],
    snippet: (id) => `<MediaPlayerCard entityId="${id}" />`,
    Demo: MediaPlayerCard,
  },
  {
    name: 'WeatherCard',
    label: 'Wetter',
    domains: ['weather'],
    snippet: (id) => `<WeatherCard entityId="${id}" />`,
    Demo: WeatherCard,
  },
  {
    name: 'PersonChip',
    label: 'Person',
    domains: ['person'],
    snippet: (id) => `<PersonChip entityId="${id}" />`,
    Demo: PersonChip,
  },
  {
    name: 'DeviceTrackerChip',
    label: 'Tracker',
    domains: ['device_tracker'],
    snippet: (id) => `<DeviceTrackerChip entityId="${id}" />`,
    Demo: DeviceTrackerChip,
  },
  {
    name: 'NumberSlider',
    label: 'Zahl',
    domains: ['input_number'],
    snippet: (id) => `<NumberSlider entityId="${id}" />`,
    Demo: NumberSlider,
  },
  {
    name: 'InputBooleanTile',
    label: 'Schalter',
    domains: ['input_boolean'],
    snippet: (id) => `<InputBooleanTile entityId="${id}" />`,
    Demo: InputBooleanTile,
  },
  {
    name: 'ActionButton',
    label: 'Aktion',
    domains: ['script'],
    snippet: (id) => `<ActionButton entityId="${id}" />`,
    Demo: ActionButton,
  },
  {
    name: 'SceneButton',
    label: 'Szene',
    domains: ['scene'],
    snippet: (id) => `<SceneButton entityId="${id}" />`,
    Demo: SceneButton,
  },
  {
    name: 'ScriptButton',
    label: 'Skript',
    domains: ['script'],
    snippet: (id) => `<ScriptButton entityId="${id}" />`,
    Demo: ScriptButton,
  },
  {
    name: 'SelectCard',
    label: 'Auswahl',
    domains: ['input_select'],
    snippet: (id) => `<SelectCard entityId="${id}" />`,
    Demo: SelectCard,
  },
  {
    name: 'LockCard',
    label: 'Schloss',
    domains: ['lock'],
    snippet: (id) => `<LockCard entityId="${id}" />`,
    Demo: LockCard,
  },
  {
    name: 'VacuumCard',
    label: 'Staubsauger',
    domains: ['vacuum'],
    snippet: (id) => `<VacuumCard entityId="${id}" />`,
    Demo: VacuumCard,
  },
  {
    name: 'FanCard',
    label: 'Ventilator',
    domains: ['fan'],
    snippet: (id) => `<FanCard entityId="${id}" />`,
    Demo: FanCard,
  },
  {
    name: 'AlarmPanel',
    label: 'Alarm',
    domains: ['alarm_control_panel'],
    snippet: (id) => `<AlarmPanel entityId="${id}" />`,
    Demo: AlarmPanel,
  },
  {
    name: 'CameraTile',
    label: 'Kamera',
    domains: ['camera'],
    snippet: (id) => `<CameraTile entityId="${id}" />`,
    Demo: CameraDemo,
  },
  {
    name: 'TimerCard',
    label: 'Timer',
    domains: ['timer'],
    snippet: (id) => `<TimerCard entityId="${id}" />`,
    Demo: TimerCard,
  },
  {
    name: 'CounterCard',
    label: 'Zähler',
    domains: ['counter'],
    snippet: (id) => `<CounterCard entityId="${id}" />`,
    Demo: CounterCard,
  },
  {
    name: 'HumidifierCard',
    label: 'Luftbefeuchter',
    domains: ['humidifier'],
    snippet: (id) => `<HumidifierCard entityId="${id}" />`,
    Demo: HumidifierCard,
  },
  {
    name: 'WaterHeaterCard',
    label: 'Warmwasser',
    domains: ['water_heater'],
    snippet: (id) => `<WaterHeaterCard entityId="${id}" />`,
    Demo: WaterHeaterCard,
  },
  {
    name: 'ValveCard',
    label: 'Ventil',
    domains: ['valve'],
    snippet: (id) => `<ValveCard entityId="${id}" />`,
    Demo: ValveCard,
  },
  {
    name: 'SirenCard',
    label: 'Sirene',
    domains: ['siren'],
    snippet: (id) => `<SirenCard entityId="${id}" />`,
    Demo: SirenCard,
  },
  {
    name: 'UpdateCard',
    label: 'Update',
    domains: ['update'],
    snippet: (id) => `<UpdateCard entityId="${id}" />`,
    Demo: UpdateCard,
  },
  {
    name: 'CalendarCard',
    label: 'Kalender',
    domains: ['calendar'],
    snippet: (id) => `<CalendarCard entityId="${id}" />`,
    Demo: CalendarCard,
  },
];

export function catalogSnippet(
  entry: WidgetCatalogEntry,
  entityId: string | null,
): string {
  if (typeof entry.snippet === 'function') {
    return entry.snippet(entityId ?? `${entry.domains[0]}.beispiel`);
  }
  return entry.snippet;
}

export function catalogSnippetDisplay(entry: WidgetCatalogEntry): string {
  return typeof entry.snippet === 'string' ? entry.snippet : `<${entry.name} … />`;
}
