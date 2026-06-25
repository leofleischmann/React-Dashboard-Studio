import { CoverCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const COVER_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'CoverCard',
    label: 'Rollo',
    category: 'domain',
    domains: ['cover'],
    inserterDefault: true,
    snippet: (id) => `<CoverCard entityId="${id}" />`,
    Demo: CoverCard,
  },
];
