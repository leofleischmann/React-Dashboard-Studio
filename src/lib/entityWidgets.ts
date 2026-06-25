import { entityDomain } from '../sdk/entityActions';
import { widgetNameForDomain } from '../sdk/ui/catalog';

export function widgetForDomain(domain: string): string {
  return widgetNameForDomain(domain);
}

export function entityWidgetSnippet(entityId: string): string {
  const widget = widgetForDomain(entityDomain(entityId));
  return `<${widget} entityId="${entityId}" />`;
}

export const WIDGET_IMPORTS =
  "import { EntityRow, Gauge, SparkChart, LightTile, ClimateCard, SelectCard, LockCard, HumidifierCard, CalendarCard, InputBooleanTile } from '@ha/ui';";

export const LAYOUT_IMPORTS =
  "import { PageShell, Tabs, Stack, Row, ResponsiveGrid, useHashRoute } from '@ha/layout';";
