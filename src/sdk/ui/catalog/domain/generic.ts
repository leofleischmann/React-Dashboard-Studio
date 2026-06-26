import {
  ActionButton,
  BinaryBadge,
  EntityRow,
  Gauge,
} from '../../cards/domain';
import type { WidgetCatalogEntry } from '../types';
import { pickNumericSensorEntity, SparkDemo, StatDemo, CircularProgressDemo, pickBatteryEntity } from '../demos';
import { actionButtonSource, binaryBadgeSource, entityRowSource } from './sources';

export const GENERIC_DOMAIN_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'Stat',
    label: 'Stat',
    category: 'domain',
    domains: ['sensor'],
    snippet: (id) =>
      `<Stat label="${id.split('.')[1] ?? 'Sensor'}" value={num(useEntity('${id}')?.state)} color="var(--rd-accent)" />`,
    Demo: StatDemo,
  },
  {
    name: 'Gauge',
    label: 'Gauge',
    category: 'domain',
    domains: ['sensor'],
    inserterDefault: true,
    snippet: (id) => `<Gauge entityId="${id}" min={0} max={100} color="var(--rd-accent)" />`,
    Demo: Gauge,
  },
  {
    name: 'SparkChart',
    label: 'SparkChart',
    category: 'domain',
    domains: ['sensor'],
    pickExample: pickNumericSensorEntity,
    snippet:
      '<SparkChart series={[…]} height={80} axes={{ xLabel: "Zeit", yLabel: "Wert" }} showLegend />',
    Demo: SparkDemo,
  },
  {
    name: 'CircularProgress',
    label: 'Fortschritts-Ring',
    category: 'domain',
    domains: ['sensor'],
    pickExample: (entities) => pickBatteryEntity(entities) ?? pickNumericSensorEntity(entities),
    snippet: (id) =>
      `<CircularProgress value={Number(useEntity('${id}', { fallback: '0' }).state) || 0} max={100} warningBelow={30} criticalBelow={15} label="…" />`,
    Demo: CircularProgressDemo,
  },
  {
    name: 'EntityRow',
    label: 'Entity-Zeile',
    category: 'domain',
    domains: ['switch'],
    inserterDefault: true,
    snippet: (id) => `<EntityRow entityId="${id}" />`,
    source: entityRowSource,
    Demo: EntityRow,
  },
  {
    name: 'BinaryBadge',
    label: 'Binary',
    category: 'domain',
    domains: ['binary_sensor'],
    inserterDefault: true,
    snippet: (id) => `<BinaryBadge entityId="${id}" />`,
    source: binaryBadgeSource,
    Demo: BinaryBadge,
  },
  {
    name: 'ActionButton',
    label: 'Aktion',
    category: 'domain',
    domains: ['button', 'automation'],
    snippet: (id) => `<ActionButton entityId="${id}" />`,
    source: actionButtonSource,
    Demo: ActionButton,
  },
];
