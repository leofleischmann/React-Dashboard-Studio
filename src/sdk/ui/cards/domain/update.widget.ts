import { UpdateCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const UPDATE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'UpdateCard',
    label: 'Update',
    category: 'domain',
    domains: ['update'],
    inserterDefault: true,
    snippet: (id) => `<UpdateCard entityId="${id}" />`,
    Demo: UpdateCard,
  }),
];
