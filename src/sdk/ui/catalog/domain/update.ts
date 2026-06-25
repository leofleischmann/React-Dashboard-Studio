import { UpdateCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const UPDATE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'UpdateCard',
    label: 'Update',
    category: 'domain',
    domains: ['update'],
    inserterDefault: true,
    snippet: (id) => `<UpdateCard entityId="${id}" />`,
    Demo: UpdateCard,
  },
];
