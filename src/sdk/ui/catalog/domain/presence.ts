import { DeviceTrackerChip, PersonChip } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const PRESENCE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'PersonChip',
    label: 'Person',
    category: 'domain',
    domains: ['person'],
    inserterDefault: true,
    snippet: (id) => `<PersonChip entityId="${id}" />`,
    Demo: PersonChip,
  },
  {
    name: 'DeviceTrackerChip',
    label: 'Tracker',
    category: 'domain',
    domains: ['device_tracker'],
    inserterDefault: true,
    snippet: (id) => `<DeviceTrackerChip entityId="${id}" />`,
    Demo: DeviceTrackerChip,
  },
];
