import { DeviceTrackerChip, PersonChip } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const PRESENCE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'PersonChip',
    label: 'Person',
    category: 'domain',
    domains: ['person'],
    inserterDefault: true,
    snippet: (id) => `<PersonChip entityId="${id}" />`,
    Demo: PersonChip,
  }),
  defineWidget({
    name: 'DeviceTrackerChip',
    label: 'Tracker',
    category: 'domain',
    domains: ['device_tracker'],
    inserterDefault: true,
    snippet: (id) => `<DeviceTrackerChip entityId="${id}" />`,
    Demo: DeviceTrackerChip,
  }),
];
