import type { WidgetCatalogEntry } from './types';
import { ValueOrb3DDemo, LiveClockDemo, pickNumericSensorEntity } from './demos';
import { SunArc } from '../featured/SunArc';

/** Featured widgets — rich visualizations (implementations live in `featured/`). */
export const FEATURED_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'SunArc',
    label: 'Sonnenbogen',
    category: 'featured',
    domains: ['sun'],
    inserterDefault: true,
    snippet: (id) => `<SunArc entityId="${id}" />`,
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
    snippet: '<LiveClock />',
    Demo: LiveClockDemo,
  },
];
