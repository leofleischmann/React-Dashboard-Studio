import { describe, expect, it } from 'vitest';
import {
  defaultEntityService,
  entityDomain,
  isEntityAvailable,
  isEntityOn,
} from '../src/sdk/entityActions';
import type { HassEntity } from '../src/sdk/hass/types';

function entity(entity_id: string, state: string): HassEntity {
  return {
    entity_id,
    state,
    attributes: {},
    last_changed: '',
    last_updated: '',
    context: { id: '', parent_id: null, user_id: null },
  };
}

describe('isEntityOn — domain-aware on/active', () => {
  it('uses state === "on" for generic toggle domains', () => {
    expect(isEntityOn(entity('light.kitchen', 'on'))).toBe(true);
    expect(isEntityOn(entity('switch.pump', 'off'))).toBe(false);
  });

  it('treats cover/valve open(ing) as on', () => {
    expect(isEntityOn(entity('cover.garage', 'open'))).toBe(true);
    expect(isEntityOn(entity('cover.garage', 'opening'))).toBe(true);
    expect(isEntityOn(entity('cover.garage', 'closed'))).toBe(false);
  });

  it('treats lock unlocked as on', () => {
    expect(isEntityOn(entity('lock.front', 'unlocked'))).toBe(true);
    expect(isEntityOn(entity('lock.front', 'locked'))).toBe(false);
  });

  it('treats media_player playing/paused as on, idle/off as off', () => {
    expect(isEntityOn(entity('media_player.tv', 'playing'))).toBe(true);
    expect(isEntityOn(entity('media_player.tv', 'paused'))).toBe(true);
    expect(isEntityOn(entity('media_player.tv', 'idle'))).toBe(false);
    expect(isEntityOn(entity('media_player.tv', 'off'))).toBe(false);
  });

  it('treats climate/water_heater as on unless off', () => {
    expect(isEntityOn(entity('climate.living', 'heat'))).toBe(true);
    expect(isEntityOn(entity('climate.living', 'off'))).toBe(false);
    expect(isEntityOn(entity('water_heater.tank', 'eco'))).toBe(true);
  });

  it('uses home for person/device_tracker', () => {
    expect(isEntityOn(entity('person.alex', 'home'))).toBe(true);
    expect(isEntityOn(entity('device_tracker.phone', 'not_home'))).toBe(false);
  });

  it('is false for unavailable/unknown and undefined', () => {
    expect(isEntityOn(entity('light.kitchen', 'unavailable'))).toBe(false);
    expect(isEntityOn(entity('light.kitchen', 'unknown'))).toBe(false);
    expect(isEntityOn(undefined)).toBe(false);
  });
});

describe('isEntityAvailable', () => {
  it('is true for a real state, false for unavailable/unknown/undefined', () => {
    expect(isEntityAvailable(entity('sensor.x', '21.5'))).toBe(true);
    expect(isEntityAvailable(entity('sensor.x', 'unavailable'))).toBe(false);
    expect(isEntityAvailable(entity('sensor.x', 'unknown'))).toBe(false);
    expect(isEntityAvailable(undefined)).toBe(false);
  });
});

describe('domain helpers still routed correctly', () => {
  it('entityDomain / defaultEntityService', () => {
    expect(entityDomain('light.kitchen')).toBe('light');
    expect(defaultEntityService('button.doorbell')).toBe('press');
    expect(defaultEntityService('scene.movie')).toBe('turn_on');
    expect(defaultEntityService('light.kitchen')).toBe('toggle');
  });
});
