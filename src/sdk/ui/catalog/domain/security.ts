import { AlarmPanel, LockCard, SirenCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const SECURITY_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'LockCard',
    label: 'Schloss',
    category: 'domain',
    domains: ['lock'],
    inserterDefault: true,
    snippet: (id) => `<LockCard entityId="${id}" />`,
    Demo: LockCard,
  },
  {
    name: 'AlarmPanel',
    label: 'Alarm',
    category: 'domain',
    domains: ['alarm_control_panel'],
    inserterDefault: true,
    snippet: (id) => `<AlarmPanel entityId="${id}" />`,
    Demo: AlarmPanel,
  },
  {
    name: 'SirenCard',
    label: 'Sirene',
    category: 'domain',
    domains: ['siren'],
    inserterDefault: true,
    snippet: (id) => `<SirenCard entityId="${id}" />`,
    Demo: SirenCard,
  },
];
