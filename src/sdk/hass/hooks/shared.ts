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
