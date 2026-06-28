import { CounterCard, TimerCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const TIMER_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'TimerCard',
    label: 'Timer',
    category: 'domain',
    domains: ['timer'],
    inserterDefault: true,
    snippet: (id) => `<TimerCard entityId="${id}" />`,
    Demo: TimerCard,
  }),
  defineWidget({
    name: 'CounterCard',
    label: 'Zähler',
    category: 'domain',
    domains: ['counter'],
    inserterDefault: true,
    snippet: (id) => `<CounterCard entityId="${id}" />`,
    Demo: CounterCard,
  }),
];
