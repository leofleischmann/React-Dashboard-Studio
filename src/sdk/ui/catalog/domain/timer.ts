import { CounterCard, TimerCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const TIMER_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'TimerCard',
    label: 'Timer',
    category: 'domain',
    domains: ['timer'],
    inserterDefault: true,
    snippet: (id) => `<TimerCard entityId="${id}" />`,
    Demo: TimerCard,
  },
  {
    name: 'CounterCard',
    label: 'Zähler',
    category: 'domain',
    domains: ['counter'],
    inserterDefault: true,
    snippet: (id) => `<CounterCard entityId="${id}" />`,
    Demo: CounterCard,
  },
];
