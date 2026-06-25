import type { WidgetCatalogEntry } from '../types';
import { CameraDemo } from '../demos';

export const CAMERA_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'CameraTile',
    label: 'Kamera',
    category: 'domain',
    domains: ['camera'],
    inserterDefault: true,
    snippet: (id) => `<CameraTile entityId="${id}" refreshSec={10} fit="cover" />`,
    Demo: CameraDemo,
  },
];
