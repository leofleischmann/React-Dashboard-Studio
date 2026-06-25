import { entityDomain } from './entityActions';

type WidgetName =
  | 'EntityRow'
  | 'Gauge'
  | 'BinaryBadge'
  | 'LightTile'
  | 'ClimateCard'
  | 'CoverCard'
  | 'MediaPlayerCard'
  | 'WeatherCard'
  | 'PersonChip'
  | 'NumberSlider'
  | 'ActionButton'
  | 'SelectCard'
  | 'LockCard'
  | 'VacuumCard'
  | 'FanCard'
  | 'AlarmPanel'
  | 'CameraTile'
  | 'TimerCard'
  | 'CounterCard'
  | 'SceneButton'
  | 'ScriptButton'
  | 'HumidifierCard'
  | 'WaterHeaterCard'
  | 'ValveCard'
  | 'SirenCard'
  | 'UpdateCard'
  | 'DeviceTrackerChip'
  | 'InputBooleanTile'
  | 'CalendarCard';

const WIDGET_BY_DOMAIN: Record<string, WidgetName> = {
  sensor: 'Gauge',
  binary_sensor: 'BinaryBadge',
  light: 'LightTile',
  switch: 'EntityRow',
  fan: 'FanCard',
  climate: 'ClimateCard',
  cover: 'CoverCard',
  media_player: 'MediaPlayerCard',
  weather: 'WeatherCard',
  person: 'PersonChip',
  device_tracker: 'DeviceTrackerChip',
  input_number: 'NumberSlider',
  script: 'ScriptButton',
  scene: 'SceneButton',
  button: 'ActionButton',
  automation: 'ActionButton',
  input_boolean: 'InputBooleanTile',
  lock: 'LockCard',
  vacuum: 'VacuumCard',
  input_select: 'SelectCard',
  select: 'SelectCard',
  alarm_control_panel: 'AlarmPanel',
  camera: 'CameraTile',
  timer: 'TimerCard',
  counter: 'CounterCard',
  humidifier: 'HumidifierCard',
  water_heater: 'WaterHeaterCard',
  valve: 'ValveCard',
  siren: 'SirenCard',
  update: 'UpdateCard',
  calendar: 'CalendarCard',
};

export function widgetForDomain(domain: string): WidgetName {
  return WIDGET_BY_DOMAIN[domain] ?? 'EntityRow';
}

export function entityWidgetSnippet(entityId: string): string {
  const widget = widgetForDomain(entityDomain(entityId));
  return `<${widget} entityId="${entityId}" />`;
}

export const WIDGET_IMPORTS =
  "import { EntityRow, Gauge, SparkChart, LightTile, ClimateCard, SelectCard, LockCard, HumidifierCard, CalendarCard, InputBooleanTile } from '@ha/ui';";

export const LAYOUT_IMPORTS =
  "import { PageShell, Tabs, Stack, Row, ResponsiveGrid, useHashRoute } from '@ha/layout';";
