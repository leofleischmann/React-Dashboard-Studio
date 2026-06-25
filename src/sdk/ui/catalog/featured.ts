import type { WidgetCatalogEntry } from './types';
import { LiveClockDemo } from './demos';
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
    name: 'LiveClock',
    label: 'Uhr',
    category: 'featured',
    domains: [],
    optionalEntity: true,
    snippet: '<LiveClock />',
    Demo: LiveClockDemo,
  },
];
