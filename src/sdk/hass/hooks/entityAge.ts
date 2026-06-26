import { useEffect, useMemo, useRef } from 'react';
import type { KnownEntityId } from '../entityId';
import type { HassEntity } from '../types';
import { entityAgeLabel, entityAgeMs } from '../../format';
import { useEntity } from './entity';
import { useTime } from './app';

export interface UseEntityAgeOptions {
  /** Re-render interval for the relative label (default 30s). */
  tickMs?: number;
  /** `relative` -> "vor 23 Min." · `since` -> "seit 23 Min." (default). */
  style?: 'relative' | 'since';
}

export interface UseEntityAgeResult {
  /** German age label derived from `last_changed`. */
  label: string;
  /** When the current state started. */
  changedAt: Date | undefined;
  /** Age in milliseconds. */
  ms: number | undefined;
  /** Current entity state. */
  state: string | undefined;
  entity: HassEntity | undefined;
}

/**
 * How long an entity has been in its current state.
 * Re-renders on entity changes and on a tick interval for live labels.
 *
 *   const door = useEntityAge('binary_sensor.tuer');
 *   <span>Tür offen {door.label}</span>
 */
export function useEntityAge(
  entityId: KnownEntityId,
  options: UseEntityAgeOptions = {},
): UseEntityAgeResult {
  const { tickMs = 30_000, style = 'since' } = options;
  const entity = useEntity(entityId);
  const now = useTime(tickMs);
  const prevStateRef = useRef<string | undefined>();

  useEffect(() => {
    const state = entity?.state;
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
  }, [entityId, entity?.state, entity?.last_changed]);

  return useMemo(() => {
    const nowMs = now.getTime();
    const changedAtRaw = entity?.last_changed
      ? new Date(entity.last_changed)
      : undefined;
    const changedAt =
      changedAtRaw && Number.isFinite(changedAtRaw.getTime())
        ? changedAtRaw
        : undefined;
    const ms = entityAgeMs(entity, nowMs);

    return {
      entity,
      state: entity?.state,
      changedAt,
      ms,
      label: entityAgeLabel(entity, { style, nowMs }),
    };
  }, [entity, now, style]);
}
