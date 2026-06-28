import { VacuumCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const VACUUM_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'VacuumCard',
    label: 'Staubsauger',
    category: 'domain',
    domains: ['vacuum'],
    inserterDefault: true,
    snippet: (id) => `<VacuumCard entityId="${id}" />`,
    Demo: VacuumCard,
  }),
];
