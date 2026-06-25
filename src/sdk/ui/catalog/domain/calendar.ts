import { CalendarCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const CALENDAR_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'CalendarCard',
    label: 'Kalender',
    category: 'domain',
    domains: ['calendar'],
    inserterDefault: true,
    snippet: (id) => `<CalendarCard entityId="${id}" />`,
    Demo: CalendarCard,
  },
];
