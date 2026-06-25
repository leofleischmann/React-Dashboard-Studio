import type { ComponentType } from 'react';
import type { HassEntity } from '../../hass/types';

/** domain = Entity-Karte · featured = Visualisierung/Hooks · composite = mehrere Entities */
export type WidgetCategory = 'domain' | 'featured' | 'composite';

export type WidgetCatalogEntry = {
  name: string;
  label: string;
  category?: WidgetCategory;
  domains: string[];
  snippet: string | ((entityId: string) => string);
  Demo: ComponentType<{ entityId: string }>;
  pickExample?: (entities: readonly HassEntity[]) => string | undefined;
  /** Standard-Widget im Entity-Inserter für diese Domain. */
  inserterDefault?: boolean;
  /** Galerie-Demo auch ohne passende Entity (Composite). */
  optionalEntity?: boolean;
};
