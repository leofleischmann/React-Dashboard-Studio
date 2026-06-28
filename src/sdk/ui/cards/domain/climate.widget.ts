import { ClimateCard, HumidifierCard, WaterHeaterCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const CLIMATE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'ClimateCard',
    label: 'Klima',
    category: 'domain',
    domains: ['climate'],
    inserterDefault: true,
    snippet: (id) =>
      `<ClimateCard entityId="${id}" showTarget showMode showToggle />`,
    Demo: ClimateCard,
  }),
  defineWidget({
    name: 'HumidifierCard',
    label: 'Luftbefeuchter',
    category: 'domain',
    domains: ['humidifier'],
    inserterDefault: true,
    snippet: (id) => `<HumidifierCard entityId="${id}" />`,
    Demo: HumidifierCard,
  }),
  defineWidget({
    name: 'WaterHeaterCard',
    label: 'Warmwasser',
    category: 'domain',
    domains: ['water_heater'],
    inserterDefault: true,
    snippet: (id) => `<WaterHeaterCard entityId="${id}" />`,
    Demo: WaterHeaterCard,
  }),
];
