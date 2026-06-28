import { SceneButton, ScriptButton } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const ACTIONS_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'SceneButton',
    label: 'Szene',
    category: 'domain',
    domains: ['scene'],
    inserterDefault: true,
    snippet: (id) => `<SceneButton entityId="${id}" />`,
    Demo: SceneButton,
  }),
  defineWidget({
    name: 'ScriptButton',
    label: 'Skript',
    category: 'domain',
    domains: ['script'],
    inserterDefault: true,
    snippet: (id) => `<ScriptButton entityId="${id}" />`,
    Demo: ScriptButton,
  }),
];
