import { entityDomain } from '../sdk/entityActions';
import { widgetNameForDomain, widgetImportStatement } from '../sdk/ui/catalog';

export function widgetForDomain(domain: string): string {
  return widgetNameForDomain(domain);
}

export function entityWidgetSnippet(entityId: string): string {
  const widget = widgetForDomain(entityDomain(entityId));
  return `<${widget} entityId="${entityId}" />`;
}

/** Derived from WIDGET_CATALOG — always in sync with registered widgets. */
export const WIDGET_IMPORTS = widgetImportStatement();
