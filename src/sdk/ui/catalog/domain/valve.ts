import { ValveCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const VALVE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'ValveCard',
    label: 'Ventil',
    category: 'domain',
    domains: ['valve'],
    inserterDefault: true,
    snippet: (id) => `<ValveCard entityId="${id}" />`,
    Demo: ValveCard,
  },
];
