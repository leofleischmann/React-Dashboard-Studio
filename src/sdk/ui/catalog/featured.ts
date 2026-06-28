import { defineWidget, type WidgetCatalogEntry } from './types';
import {
  LiveClockDemo,
  MinitimelineDemo,
  pickNumericSensorEntity,
  ValueOrb3DDemo,
  WeatherForecastRowDemo,
  WeatherNowDemo,
} from './demos';
import { SunArc } from '../featured/SunArc';

/** Featured widgets — rich visualizations (implementations live in `featured/`). */
export const FEATURED_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'SunArc',
    label: 'Sonnenbogen',
    category: 'featured',
    domains: ['sun'],
    inserterDefault: true,
    snippet: (id) => `<SunArc entityId="${id}" showStars showMoon size="default" />`,
    Demo: SunArc,
  }),
  defineWidget({
    name: 'ValueOrb3D',
    label: 'Wert-Orb',
    category: 'featured',
    domains: ['sensor', 'number', 'input_number'],
    pickExample: pickNumericSensorEntity,
    snippet: (id) =>
      `<ValueOrb3D entityId="${id}" min={0} max={100} color="#e63a12" size="default" />`,
    Demo: ValueOrb3DDemo,
  }),
  defineWidget({
    name: 'LiveClock',
    label: 'Uhr',
    category: 'featured',
    domains: [],
    optionalEntity: true,
    snippet: '<LiveClock showSeconds locale="de-DE" size="default" />',
    Demo: LiveClockDemo,
  }),
  defineWidget({
    name: 'WeatherNow',
    label: 'Wetter aktuell',
    category: 'featured',
    domains: ['weather'],
    inserterDefault: true,
    snippet: (id) =>
      `<WeatherNow entityId="${id}" locale="de-DE" forecastDays={5} showMetrics showForecast />`,
    Demo: WeatherNowDemo,
  }),
  defineWidget({
    name: 'WeatherForecastRow',
    label: '5-Tage-Vorhersage',
    category: 'featured',
    domains: ['weather'],
    snippet: (id) =>
      `<WeatherForecastRow entityId="${id}" days={5} locale="de-DE" showPrecipitation />`,
    Demo: WeatherForecastRowDemo,
  }),
  defineWidget({
    name: 'Minitimeline',
    label: 'Aktivitäts-Timeline',
    category: 'featured',
    domains: ['binary_sensor', 'light', 'switch', 'sensor'],
    pickExample: (entities) =>
      entities.find((e) => e.entity_id.startsWith('binary_sensor.'))?.entity_id ??
      entities.find((e) => e.entity_id.startsWith('light.'))?.entity_id,
    snippet: (id) =>
      `<Minitimeline entityId="${id}" limit={8} hours={24} timeFormat="clock" showRelativeHint />`,
    Demo: MinitimelineDemo,
  }),
];
