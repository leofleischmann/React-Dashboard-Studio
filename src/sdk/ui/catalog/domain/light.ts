import { LightTile } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const LIGHT_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'LightTile',
    label: 'Licht',
    category: 'domain',
    domains: ['light'],
    inserterDefault: true,
    snippet: (id) => `<LightTile entityId="${id}" showBrightness />`,
    Demo: LightTile,
  },
];
