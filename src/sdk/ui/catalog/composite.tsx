import type { HassEntity } from '../../hass/types';
import { entityDisplayName } from '../../format';
import { BatteryRow, DeviceCard, EnergyDeviceCard, RoomCard } from '../cards/composite';
import { Grid, Stat } from '../primitives';
import type { WidgetCatalogEntry } from './types';

function pickRoomSensorKey(entities: readonly HassEntity[]): string | undefined {
  const match = entities.find((e) =>
    /^sensor\.sensor_(.+)_temperature$/.test(e.entity_id),
  );
  return match?.entity_id.match(/^sensor\.sensor_(.+)_temperature$/)?.[1];
}

function pickBatteryEntity(entities: readonly HassEntity[]): string | undefined {
  return entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      e.attributes.device_class === 'battery',
  )?.entity_id;
}

function pickDeviceSet(entities: readonly HassEntity[]) {
  const power = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      (e.attributes.device_class === 'power' ||
        e.attributes.unit_of_measurement === 'W'),
  );
  const sw = entities.find((e) => e.entity_id.startsWith('switch.'));
  if (!power || !sw) return undefined;
  return { powerId: power.entity_id, switchId: sw.entity_id, name: entityDisplayName(power, power.entity_id) };
}

function RoomCardDemo({ entityId }: { entityId: string }) {
  const key =
    entityId.match(/^sensor\.sensor_(.+)_temperature$/)?.[1] ?? 'raum';
  return <RoomCard name={`Raum (${key})`} sensorKey={key} />;
}

function pickEnergySet(entities: readonly HassEntity[]) {
  const energy = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      (e.attributes.device_class === 'energy' ||
        e.attributes.unit_of_measurement === 'kWh'),
  );
  if (!energy) return undefined;
  const power = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      (e.attributes.device_class === 'power' ||
        e.attributes.unit_of_measurement === 'W'),
  );
  const sw = entities.find((e) => e.entity_id.startsWith('switch.'));
  return {
    energyId: energy.entity_id,
    powerId: power?.entity_id,
    switchId: sw?.entity_id,
    name: entityDisplayName(energy, energy.entity_id),
  };
}

function EnergyDeviceCardDemo({ entityId }: { entityId: string }) {
  return (
    <EnergyDeviceCard
      name="Energie"
      energyId={entityId}
      showWeekChart={false}
    />
  );
}

function DeviceCardDemo({ entityId }: { entityId: string }) {
  return (
    <DeviceCard
      name="Gerät"
      powerId={entityId}
      kwhId={entityId}
      costId={entityId}
      switchId={entityId.replace(/^sensor\./, 'switch.')}
    />
  );
}

function BatteryRowDemo({ entityId }: { entityId: string }) {
  return <BatteryRow name="Batterie" entityId={entityId} />;
}

function GridDemo(_props: { entityId: string }) {
  return (
    <Grid min={100}>
      <Stat label="A" value="1" />
      <Stat label="B" value="2" accent />
      <Stat label="C" value="3" />
    </Grid>
  );
}

/** Multi-entity pattern widgets (implementations in `cards/composite/`). */
export const COMPOSITE_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    name: 'RoomCard',
    label: 'Raum',
    category: 'composite',
    domains: ['sensor'],
    optionalEntity: true,
    pickExample: (entities) => {
      const key = pickRoomSensorKey(entities);
      return key ? `sensor.sensor_${key}_temperature` : undefined;
    },
    snippet: '<RoomCard name="Wohnzimmer" sensorKey="wohnzimmer" lightId="light.…" />',
    Demo: RoomCardDemo,
  },
  {
    name: 'EnergyDeviceCard',
    label: 'Energie-Gerät',
    category: 'composite',
    domains: ['sensor'],
    optionalEntity: true,
    pickExample: (entities) => pickEnergySet(entities)?.energyId,
    snippet:
      '<EnergyDeviceCard name="…" energyId="sensor.…_energy" powerId="sensor.…_power" switchId="switch.…" />',
    Demo: EnergyDeviceCardDemo,
  },
  {
    name: 'DeviceCard',
    label: 'Gerät (Energie)',
    category: 'composite',
    domains: ['sensor'],
    optionalEntity: true,
    pickExample: (entities) => pickDeviceSet(entities)?.powerId,
    snippet:
      '<DeviceCard name="…" powerId="…" kwhId="…" costId="…" switchId="…" />',
    Demo: DeviceCardDemo,
  },
  {
    name: 'BatteryRow',
    label: 'Batterie',
    category: 'composite',
    domains: ['sensor'],
    pickExample: pickBatteryEntity,
    snippet: '<BatteryRow name="…" entityId="sensor.…" />',
    Demo: BatteryRowDemo,
  },
  {
    name: 'Grid',
    label: 'Grid',
    category: 'composite',
    domains: [],
    optionalEntity: true,
    snippet: '<Grid min={180}>…</Grid>',
    Demo: GridDemo,
  },
];
