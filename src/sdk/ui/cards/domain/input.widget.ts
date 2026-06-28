import { InputBooleanTile, NumberSlider, SelectCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const INPUT_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'NumberSlider',
    label: 'Zahl',
    category: 'domain',
    domains: ['input_number'],
    inserterDefault: true,
    snippet: (id) => `<NumberSlider entityId="${id}" min={0} max={100} step={1} />`,
    Demo: NumberSlider,
  }),
  defineWidget({
    name: 'InputBooleanTile',
    label: 'Schalter',
    category: 'domain',
    domains: ['input_boolean'],
    inserterDefault: true,
    snippet: (id) => `<InputBooleanTile entityId="${id}" />`,
    Demo: InputBooleanTile,
  }),
  defineWidget({
    name: 'SelectCard',
    label: 'Auswahl',
    category: 'domain',
    domains: ['input_select', 'select'],
    inserterDefault: true,
    snippet: (id) => `<SelectCard entityId="${id}" />`,
    Demo: SelectCard,
  }),
];
