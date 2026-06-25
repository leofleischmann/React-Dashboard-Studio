import { WeatherCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const WEATHER_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'WeatherCard',
    label: 'Wetter',
    category: 'domain',
    domains: ['weather'],
    inserterDefault: true,
    snippet: (id) => `<WeatherCard entityId="${id}" showWind />`,
    Demo: WeatherCard,
  },
];
