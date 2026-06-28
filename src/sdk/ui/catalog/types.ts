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
  /**
   * Optional editable source — a complete, self-contained component the user can
   * drop into their dashboard instead of importing the widget. Powers the
   * "Quelltext einfügen" (eject) action: full design freedom, no black box.
   */
  source?: string | ((entityId: string) => string);
  Demo: ComponentType<{ entityId: string }>;
  pickExample?: (entities: readonly HassEntity[]) => string | undefined;
  /** Standard-Widget im Entity-Inserter für diese Domain. */
  inserterDefault?: boolean;
  /** Galerie-Demo auch ohne passende Entity (Composite). */
  optionalEntity?: boolean;
};

/**
 * Identity helper that gives a widget descriptor its full `WidgetCatalogEntry`
 * type (autocomplete + checking) at the definition site. Descriptors live next
 * to their component (`cards/domain/<x>.widget.ts`) and are assembled into the
 * catalog — there is no separate metadata tree to keep in sync.
 */
export function defineWidget(entry: WidgetCatalogEntry): WidgetCatalogEntry {
  return entry;
}
