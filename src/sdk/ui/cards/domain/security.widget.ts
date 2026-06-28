import { AlarmPanel, LockCard, SirenCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const SECURITY_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'LockCard',
    label: 'Schloss',
    category: 'domain',
    domains: ['lock'],
    inserterDefault: true,
    snippet: (id) => `<LockCard entityId="${id}" />`,
    Demo: LockCard,
  }),
  defineWidget({
    name: 'AlarmPanel',
    label: 'Alarm',
    category: 'domain',
    domains: ['alarm_control_panel'],
    inserterDefault: true,
    snippet: (id) => `<AlarmPanel entityId="${id}" />`,
    Demo: AlarmPanel,
  }),
  defineWidget({
    name: 'SirenCard',
    label: 'Sirene',
    category: 'domain',
    domains: ['siren'],
    inserterDefault: true,
    snippet: (id) => `<SirenCard entityId="${id}" />`,
    Demo: SirenCard,
  }),
];
