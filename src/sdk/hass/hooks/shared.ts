import type { HassEntity } from '../types';

/** Split `\0`-joined entity id keys from {@link normalizeIds}. */
export function entityIdsFromKey(idsKey: string): string[] {
  return idsKey ? idsKey.split('\0') : [];
}

/** Keep array reference stable when contents are unchanged (useSyncExternalStore). */
export function stableArraySnapshot<T>(
  cacheRef: { current: T[] },
  next: T[],
): T[] {
  const prev = cacheRef.current;
  if (prev.length === next.length && prev.every((item, i) => item === next[i])) {
    return prev;
  }
  cacheRef.current = next;
  return next;
}

/** Keep entity reference stable when fallback stubs would otherwise allocate each tick. */
export function stableEntitySnapshot(
  cacheRef: { current: { entity: HassEntity | undefined; key: string } },
  next: HassEntity | undefined,
): HassEntity | undefined {
  if (next === undefined) {
    if (cacheRef.current.entity === undefined) return undefined;
    cacheRef.current = { entity: undefined, key: '' };
    return undefined;
  }
  const key = `${next.entity_id}\0${next.state}\0${next.last_changed}\0${next.last_updated}`;
  if (cacheRef.current.key === key && cacheRef.current.entity) {
    return cacheRef.current.entity;
  }
  cacheRef.current = { entity: next, key };
  return next;
}
