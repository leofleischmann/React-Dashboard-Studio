// Shared entity-picking helpers for the example dashboard.
// Picks representative entities from whatever exists — never assumes a fixed entity_id.
import type { HassEntity } from '@ha';

export type Entities = readonly HassEntity[];

const UNAVAILABLE = new Set(['unavailable', 'unknown', 'none', '']);

export function domainOf(id: string): string {
  return id.split('.')[0] ?? '';
}

export function isNumeric(e: HassEntity): boolean {
  return (
    !UNAVAILABLE.has(e.state) && !Number.isNaN(Number.parseFloat(e.state))
  );
}

export function byDomain(entities: Entities, domain: string): HassEntity[] {
  return entities.filter((e) => e.entity_id.startsWith(`${domain}.`));
}

export function firstByDomain(entities: Entities, domain: string): HassEntity | undefined {
  return entities.find((e) => e.entity_id.startsWith(`${domain}.`));
}

export function firstWithDeviceClass(
  entities: Entities,
  domain: string,
  deviceClass: string,
): HassEntity | undefined {
  return entities.find(
    (e) =>
      e.entity_id.startsWith(`${domain}.`) &&
      e.attributes.device_class === deviceClass,
  );
}

/** Numeric sensors, temperature first, for charts. */
export function numericSensors(entities: Entities, limit = 4): HassEntity[] {
  const numeric = byDomain(entities, 'sensor').filter(isNumeric);
  const temp = numeric.filter((e) => e.attributes.device_class === 'temperature');
  const pool = temp.length >= 2 ? temp : numeric;
  return pool.slice(0, limit);
}

/** Power sensors (W) for energy visualisations. */
export function powerSensors(entities: Entities): HassEntity[] {
  return byDomain(entities, 'sensor').filter(
    (e) =>
      isNumeric(e) &&
      (e.attributes.device_class === 'power' ||
        e.attributes.unit_of_measurement === 'W'),
  );
}

/** An energy/total_increasing sensor (kWh) — good for aggregate demos. */
export function energySensor(entities: Entities): HassEntity | undefined {
  return byDomain(entities, 'sensor').find(
    (e) =>
      e.attributes.device_class === 'energy' ||
      e.attributes.unit_of_measurement === 'kWh',
  );
}

export function batterySensors(entities: Entities): HassEntity[] {
  return byDomain(entities, 'sensor')
    .filter((e) => e.attributes.device_class === 'battery' && isNumeric(e))
    .sort((a, b) => Number.parseFloat(a.state) - Number.parseFloat(b.state));
}

/** Rooms following the `sensor.sensor_<key>_temperature` convention. */
export function roomKeys(entities: Entities): string[] {
  const keys: string[] = [];
  for (const e of entities) {
    const m = e.entity_id.match(/^sensor\.sensor_(.+)_temperature$/);
    if (m?.[1]) keys.push(m[1]);
  }
  return keys;
}

export function countOn(entities: HassEntity[], onStates = ['on']): number {
  return entities.filter((e) => onStates.includes(e.state)).length;
}

export interface HomeContext {
  lights: HassEntity[];
  lightsOn: number;
  climates: HassEntity[];
  climate?: HassEntity;
  weather?: HassEntity;
  persons: HassEntity[];
  personsHome: number;
  covers: HassEntity[];
  locks: HassEntity[];
  mediaPlaying?: HassEntity;
  scenes: HassEntity[];
  scripts: HassEntity[];
  power: HassEntity[];
  battery: HassEntity[];
  rooms: string[];
  motion: HassEntity[];
  calendars: HassEntity[];
}

/** One pass that derives everything the Home page needs. */
export function homeContext(entities: Entities): HomeContext {
  const lights = byDomain(entities, 'light');
  const climates = byDomain(entities, 'climate');
  const persons = [
    ...byDomain(entities, 'person'),
    ...byDomain(entities, 'device_tracker'),
  ];
  const media = byDomain(entities, 'media_player');
  return {
    lights,
    lightsOn: countOn(lights),
    climates,
    climate: climates[0],
    weather: firstByDomain(entities, 'weather'),
    persons,
    personsHome: countOn(persons, ['home', 'on']),
    covers: byDomain(entities, 'cover'),
    locks: byDomain(entities, 'lock'),
    mediaPlaying: media.find((m) => m.state === 'playing') ?? media[0],
    scenes: byDomain(entities, 'scene'),
    scripts: byDomain(entities, 'script'),
    power: powerSensors(entities),
    battery: batterySensors(entities),
    rooms: roomKeys(entities),
    motion: byDomain(entities, 'binary_sensor').filter(
      (e) => e.attributes.device_class === 'motion',
    ),
    calendars: byDomain(entities, 'calendar'),
  };
}
