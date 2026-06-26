import { entityDomain } from '../sdk/entityActions';
import { widgetNameForDomain } from '../sdk/ui/catalog';

export function widgetForDomain(domain: string): string {
  return widgetNameForDomain(domain);
}

/** Usage tag for a widget — the `<Tag … />` that an eject drops at the cursor. */
export function entityWidgetSnippet(entityId: string): string {
  const widget = widgetForDomain(entityDomain(entityId));
  return `<${widget} entityId="${entityId}" />`;
}
