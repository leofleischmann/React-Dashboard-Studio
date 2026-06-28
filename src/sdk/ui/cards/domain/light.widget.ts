import { LightTile } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const LIGHT_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'LightTile',
    label: 'Licht',
    category: 'domain',
    domains: ['light'],
    inserterDefault: true,
    snippet: (id) => `<LightTile entityId="${id}" showBrightness />`,
    Demo: LightTile,
  }),
];
