import { CoverCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const COVER_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'CoverCard',
    label: 'Rollo',
    category: 'domain',
    domains: ['cover'],
    inserterDefault: true,
    snippet: (id) => `<CoverCard entityId="${id}" />`,
    Demo: CoverCard,
  }),
];
