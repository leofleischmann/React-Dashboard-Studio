import type { WidgetCatalogEntry } from './types';
import {
  LiveClockDemo,
  MinitimelineDemo,
  pickNumericSensorEntity,
  ValueOrb3DDemo,
  WeatherForecastRowDemo,
} from './demos';
import { SunArc } from '../featured/SunArc';

/** Featured widgets — rich visualizations (implementations live in `featured/`). */
export const FEATURED_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'SunArc',
    label: 'Sonnenbogen',
    category: 'featured',
    domains: ['sun'],
    inserterDefault: true,
    snippet: (id) => `<SunArc entityId="${id}" showStars showMoon />`,
    Demo: SunArc,
  },
  {
    name: 'ValueOrb3D',
    label: 'Wert-Orb',
    category: 'featured',
    domains: ['sensor', 'number', 'input_number'],
    pickExample: pickNumericSensorEntity,
    snippet: (id) => `<ValueOrb3D entityId="${id}" min={0} max={100} />`,
    Demo: ValueOrb3DDemo,
  },
  {
    name: 'LiveClock',
    label: 'Uhr',
    category: 'featured',
    domains: [],
    optionalEntity: true,
    snippet: '<LiveClock showSeconds locale="de-DE" />',
    Demo: LiveClockDemo,
  },
  {
    name: 'WeatherForecastRow',
    label: '5-Tage-Vorhersage',
    category: 'featured',
    domains: ['weather'],
    snippet: (id) => `<WeatherForecastRow entityId="${id}" days={5} />`,
    Demo: WeatherForecastRowDemo,
  },
  {
    name: 'Minitimeline',
    label: 'Aktivitäts-Timeline',
    category: 'featured',
    domains: ['binary_sensor', 'light', 'switch', 'sensor'],
    pickExample: (entities) =>
      entities.find((e) => e.entity_id.startsWith('binary_sensor.'))?.entity_id ??
      entities.find((e) => e.entity_id.startsWith('light.'))?.entity_id,
    snippet: (id) => `<Minitimeline entityId="${id}" limit={8} hours={24} />`,
    Demo: MinitimelineDemo,
  },
];
