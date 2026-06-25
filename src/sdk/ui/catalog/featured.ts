import type { HassEntity } from '../../hass/types';
import type { WidgetCatalogEntry } from './types';
import { LiveClockDemo } from './demos';
import { HoloCore } from '../featured/HoloCore';
import { EnergyScene3D } from '../featured/EnergyScene3D';
import { SunArc } from '../featured/SunArc';

function pickPowerSensor(entities: readonly HassEntity[]): string | undefined {
  const sensors = entities.filter((e) => e.entity_id.startsWith('sensor.'));
  const power = sensors.find(
    (e) =>
      e.attributes.device_class === 'power' &&
      !Number.isNaN(Number.parseFloat(e.state)),
  );
  if (power) return power.entity_id;
  const byUnit = sensors.find((e) => {
    const u = String(e.attributes.unit_of_measurement ?? '').toLowerCase();
    return (u === 'w' || u === 'kw') && !Number.isNaN(Number.parseFloat(e.state));
  });
  return byUnit?.entity_id;
}

/** Featured widgets — rich visualizations (implementations live in `featured/`). */
export const FEATURED_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'SunArc',
    label: 'Sonnenbogen',
    category: 'featured',
    domains: ['sun'],
    inserterDefault: true,
    snippet: (id) => `<SunArc entityId="${id}" />`,
    Demo: SunArc,
  },
  {
    name: 'HoloCore',
    label: 'Holo-Kern',
    category: 'featured',
    domains: ['sensor'],
    pickExample: pickPowerSensor,
    snippet: (id) => `<HoloCore entityId="${id}" />`,
    Demo: HoloCore,
  },
  {
    name: 'EnergyScene3D',
    label: '3D Energie-Kern',
    category: 'featured',
    domains: ['sensor'],
    pickExample: pickPowerSensor,
    snippet: (id) => `<EnergyScene3D entityId="${id}" />`,
    Demo: EnergyScene3D,
  },
  {
    name: 'LiveClock',
    label: 'Uhr',
    category: 'featured',
    domains: [],
    optionalEntity: true,
    snippet: '<LiveClock />',
    Demo: LiveClockDemo,
  },
];
