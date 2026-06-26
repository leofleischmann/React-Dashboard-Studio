import { useMemo } from 'react';
import type { HassEntity } from '../types';
import {
  defaultEntityService,
  entityDomain,
  isEntityAvailable,
  isEntityOn,
} from '../../entityActions';
import { callService } from './app';
import { useEntity } from './entity';

type ServiceData = Record<string, unknown>;

/** Reactive entity state plus ready-to-use action callbacks for one entity. */
export interface EntityActions {
  readonly entityId: string;
  /** Live entity (re-renders on change), or undefined if not loaded. */
  readonly entity: HassEntity | undefined;
  /** Current state string, or undefined when unavailable/unknown. */
  readonly state: string | undefined;
  /** Domain-aware on/active flag (cover open, lock unlocked, climate not off…). */
  readonly isOn: boolean;
  /** True while the entity has a usable state. */
  readonly isAvailable: boolean;
  /** Toggle via `homeassistant.toggle` (works across light/switch/cover/lock/…). */
  toggle(data?: ServiceData): Promise<unknown>;
  turnOn(data?: ServiceData): Promise<unknown>;
  turnOff(data?: ServiceData): Promise<unknown>;
  /** Momentary trigger for button/scene/script/automation/input_button. */
  press(data?: ServiceData): Promise<unknown>;
  /** Escape hatch: call any service on this entity's domain. */
  call(service: string, data?: ServiceData): Promise<unknown>;
}

/**
 * One-stop hook for interactive tiles: reactive state plus the actions you
 * usually need, without rewriting `callService` boilerplate per component.
 *
 *   const light = useEntityActions('light.kitchen');
 *   <button onClick={() => light.toggle()}>{light.isOn ? 'An' : 'Aus'}</button>
 *
 * Action callbacks are stable across renders (memoised on `entityId`).
 */
export function useEntityActions(entityId: string): EntityActions {
  const entity = useEntity(entityId);

  const actions = useMemo(() => {
    const target = { entity_id: entityId };
    const domain = entityDomain(entityId);
    return {
      toggle: (data?: ServiceData) => callService('homeassistant', 'toggle', data, target),
      turnOn: (data?: ServiceData) => callService('homeassistant', 'turn_on', data, target),
      turnOff: (data?: ServiceData) => callService('homeassistant', 'turn_off', data, target),
      press: (data?: ServiceData) =>
        callService(domain, defaultEntityService(entityId), data, target),
      call: (service: string, data?: ServiceData) => callService(domain, service, data, target),
    };
  }, [entityId]);

  return useMemo<EntityActions>(
    () => ({
      entityId,
      entity,
      state: isEntityAvailable(entity) ? entity?.state : undefined,
      isOn: isEntityOn(entity),
      isAvailable: isEntityAvailable(entity),
      ...actions,
    }),
    [entityId, entity, actions],
  );
}
