import type { WidgetCatalogEntry } from './types';
import { EnergyScene3DDemo, LiveClockDemo, pickNumericSensorEntity } from './demos';
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
    name: 'EnergyScene3D',
    label: 'Wert-Orb',
    category: 'featured',
    domains: ['sensor', 'number', 'input_number'],
    pickExample: pickNumericSensorEntity,
    snippet: (id) => `<EnergyScene3D entityId="${id}" min={0} max={100} />`,
    Demo: EnergyScene3DDemo,
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
