import {
  ActionButton,
  BinaryBadge,
  EntityRow,
  Gauge,
} from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';
import { pickNumericSensorEntity, SparkDemo, StatDemo } from '../demos';

export const GENERIC_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'Stat',
    label: 'Stat',
    category: 'domain',
    domains: ['sensor'],
    snippet: (id) =>
      `<Stat label="${id.split('.')[1] ?? 'Sensor'}" value={num(useEntity('${id}')?.state)} />`,
    Demo: StatDemo,
  },
  {
    name: 'Gauge',
    label: 'Gauge',
    category: 'domain',
    domains: ['sensor'],
    inserterDefault: true,
    snippet: (id) => `<Gauge entityId="${id}" min={0} max={100} />`,
    Demo: Gauge,
  },
  {
    name: 'SparkChart',
    label: 'SparkChart',
    category: 'domain',
    domains: ['sensor'],
    pickExample: pickNumericSensorEntity,
    snippet: '<SparkChart series={[…]} height={120} axes={{ xLabel: "Zeit", yLabel: "W" }} />',
    Demo: SparkDemo,
  },
  {
    name: 'EntityRow',
    label: 'Entity-Zeile',
    category: 'domain',
    domains: ['switch'],
    inserterDefault: true,
    snippet: (id) => `<EntityRow entityId="${id}" />`,
    Demo: EntityRow,
  },
  {
    name: 'BinaryBadge',
    label: 'Binary',
    category: 'domain',
    domains: ['binary_sensor'],
    inserterDefault: true,
    snippet: (id) => `<BinaryBadge entityId="${id}" />`,
    Demo: BinaryBadge,
  },
  {
    name: 'ActionButton',
    label: 'Aktion',
    category: 'domain',
    domains: ['button', 'automation'],
    snippet: (id) => `<ActionButton entityId="${id}" />`,
    Demo: ActionButton,
  },
];
