import { MediaPlayerCard } from './index';
import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';

export const MEDIA_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'MediaPlayerCard',
    label: 'Media',
    category: 'domain',
    domains: ['media_player'],
    inserterDefault: true,
    snippet: (id) => `<MediaPlayerCard entityId="${id}" />`,
    Demo: MediaPlayerCard,
  }),
];
