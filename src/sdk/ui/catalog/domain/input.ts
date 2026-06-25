import { InputBooleanTile, NumberSlider, SelectCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const INPUT_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'NumberSlider',
    label: 'Zahl',
    category: 'domain',
    domains: ['input_number'],
    inserterDefault: true,
    snippet: (id) => `<NumberSlider entityId="${id}" min={0} max={100} step={1} />`,
    Demo: NumberSlider,
  },
  {
    name: 'InputBooleanTile',
    label: 'Schalter',
    category: 'domain',
    domains: ['input_boolean'],
    inserterDefault: true,
    snippet: (id) => `<InputBooleanTile entityId="${id}" />`,
    Demo: InputBooleanTile,
  },
  {
    name: 'SelectCard',
    label: 'Auswahl',
    category: 'domain',
    domains: ['input_select', 'select'],
    inserterDefault: true,
    snippet: (id) => `<SelectCard entityId="${id}" />`,
    Demo: SelectCard,
  },
];
