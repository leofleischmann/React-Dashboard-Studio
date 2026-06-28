import { ValveCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const VALVE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'ValveCard',
    label: 'Ventil',
    category: 'domain',
    domains: ['valve'],
    inserterDefault: true,
    snippet: (id) => `<ValveCard entityId="${id}" />`,
    Demo: ValveCard,
  }),
];
