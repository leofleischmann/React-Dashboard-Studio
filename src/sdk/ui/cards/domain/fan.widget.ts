import { FanCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const FAN_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'FanCard',
    label: 'Ventilator',
    category: 'domain',
    domains: ['fan'],
    inserterDefault: true,
    snippet: (id) => `<FanCard entityId="${id}" />`,
    Demo: FanCard,
  }),
];
