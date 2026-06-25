import { SceneButton, ScriptButton } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const ACTIONS_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'SceneButton',
    label: 'Szene',
    category: 'domain',
    domains: ['scene'],
    inserterDefault: true,
    snippet: (id) => `<SceneButton entityId="${id}" />`,
    Demo: SceneButton,
  },
  {
    name: 'ScriptButton',
    label: 'Skript',
    category: 'domain',
    domains: ['script'],
    inserterDefault: true,
    snippet: (id) => `<ScriptButton entityId="${id}" />`,
    Demo: ScriptButton,
  },
];
