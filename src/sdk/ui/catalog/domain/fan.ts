import { FanCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const FAN_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'FanCard',
    label: 'Ventilator',
    category: 'domain',
    domains: ['fan'],
    inserterDefault: true,
    snippet: (id) => `<FanCard entityId="${id}" />`,
    Demo: FanCard,
  },
];
