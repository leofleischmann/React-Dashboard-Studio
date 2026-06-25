import { VacuumCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const VACUUM_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'VacuumCard',
    label: 'Staubsauger',
    category: 'domain',
    domains: ['vacuum'],
    inserterDefault: true,
    snippet: (id) => `<VacuumCard entityId="${id}" />`,
    Demo: VacuumCard,
  },
];
