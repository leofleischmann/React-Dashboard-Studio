import { ClimateCard, HumidifierCard, WaterHeaterCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const CLIMATE_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'ClimateCard',
    label: 'Klima',
    category: 'domain',
    domains: ['climate'],
    inserterDefault: true,
    snippet: (id) => `<ClimateCard entityId="${id}" />`,
    Demo: ClimateCard,
  },
  {
    name: 'HumidifierCard',
    label: 'Luftbefeuchter',
    category: 'domain',
    domains: ['humidifier'],
    inserterDefault: true,
    snippet: (id) => `<HumidifierCard entityId="${id}" />`,
    Demo: HumidifierCard,
  },
  {
    name: 'WaterHeaterCard',
    label: 'Warmwasser',
    category: 'domain',
    domains: ['water_heater'],
    inserterDefault: true,
    snippet: (id) => `<WaterHeaterCard entityId="${id}" />`,
    Demo: WaterHeaterCard,
  },
];
