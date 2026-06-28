import { defineWidget, type WidgetCatalogEntry } from '../../catalog/types';
import { CameraDemo } from '../../catalog/demos';

export const CAMERA_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  defineWidget({
    name: 'CameraTile',
    label: 'Kamera',
    category: 'domain',
    domains: ['camera'],
    inserterDefault: true,
    snippet: (id) => `<CameraTile entityId="${id}" refreshSec={10} fit="cover" />`,
    Demo: CameraDemo,
  }),
];
