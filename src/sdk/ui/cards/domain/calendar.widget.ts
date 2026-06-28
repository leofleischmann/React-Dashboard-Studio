import { CalendarCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const CALENDAR_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'CalendarCard',
    label: 'Kalender',
    category: 'domain',
    domains: ['calendar'],
    inserterDefault: true,
    snippet: (id) => `<CalendarCard entityId="${id}" />`,
    Demo: CalendarCard,
  }),
];
