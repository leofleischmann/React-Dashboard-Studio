import { MediaPlayerCard } from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';

export const MEDIA_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'MediaPlayerCard',
    label: 'Media',
    category: 'domain',
    domains: ['media_player'],
    inserterDefault: true,
    snippet: (id) => `<MediaPlayerCard entityId="${id}" />`,
    Demo: MediaPlayerCard,
  },
];
