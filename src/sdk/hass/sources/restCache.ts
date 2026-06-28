/**
 * Shared in-memory cache for HA REST reads (history, statistics).
 * Multiple hooks with the same entity set + time window share one request and refresh timer.
 */

type Listener = () => void;

interface CacheBucket<T> {
  data: T;
  inflight: Promise<T> | null;
  /** true after the first fetch attempt completed (success or failure) */
  loaded: boolean;
  /** listener -> refresh interval (ms) requested by that subscriber */
  listeners: Map<Listener, number>;
  timer: ReturnType<typeof setInterval> | null;
  entityIds: string[];
  param: number;
}

function normalizeIds(entityIds: readonly string[]): string {
  return [...entityIds].sort().join('\0');
}

function bucketKey(idsKey: string, param: number): string {
  return `${param}\0${idsKey}`;
}

function minRefreshMs(listeners: Map<Listener, number>): number {
  let min = Infinity;
  for (const ms of listeners.values()) min = Math.min(min, ms);
  return min;
}

function createSharedRestCache<T>(
  fetch: (entityIds: string[], param: number) => Promise<T>,
  empty: T,
) {
  const buckets = new Map<string, CacheBucket<T>>();

  function getOrCreateBucket(
    key: string,
    entityIds: string[],
    param: number,
  ): CacheBucket<T> {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        data: empty,
        inflight: null,
        loaded: false,
        listeners: new Map(),
        timer: null,
        entityIds,
        param,
      };
      buckets.set(key, bucket);
    }
    return bucket;
  }

  function notify(bucket: CacheBucket<T>): void {
    for (const listener of bucket.listeners.keys()) listener();
  }

  async function load(bucket: CacheBucket<T>): Promise<void> {
    if (bucket.inflight) {
      await bucket.inflight;
      return;
    }

    bucket.inflight = fetch(bucket.entityIds, bucket.param)
      .then((data) => {
        bucket.data = data;
        return data;
      })
      .catch(() => empty)
      .finally(() => {
        bucket.loaded = true;
        bucket.inflight = null;
        notify(bucket);
      });

    await bucket.inflight;
  }

  function syncTimer(key: string, bucket: CacheBucket<T>): void {
    if (bucket.timer) {
      clearInterval(bucket.timer);
      bucket.timer = null;
    }
    if (bucket.listeners.size === 0) {
      buckets.delete(key);
      return;
    }

    const refreshMs = minRefreshMs(bucket.listeners);
    if (!Number.isFinite(refreshMs)) return;

    bucket.timer = setInterval(() => {
      void load(bucket);
    }, refreshMs);
  }

  function subscribe(
    entityIds: readonly string[],
    param: number,
    refreshMs: number,
    listener: Listener,
  ): () => void {
    if (entityIds.length === 0) return () => {};

    const ids = [...entityIds];
    const key = bucketKey(normalizeIds(ids), param);
    const bucket = getOrCreateBucket(key, ids, param);

    bucket.listeners.set(listener, refreshMs);
    if (!bucket.loaded && !bucket.inflight) {
      void load(bucket);
    }
    syncTimer(key, bucket);

    return () => {
      bucket.listeners.delete(listener);
      syncTimer(key, bucket);
    };
  }

  function getSnapshot(entityIds: readonly string[], param: number): T {
    if (entityIds.length === 0) return empty;
    const key = bucketKey(normalizeIds(entityIds), param);
    return buckets.get(key)?.data ?? empty;
  }

  function isPending(entityIds: readonly string[], param: number): boolean {
    if (entityIds.length === 0) return false;
    const key = bucketKey(normalizeIds(entityIds), param);
    const bucket = buckets.get(key);
    return bucket ? !bucket.loaded : false;
  }

  return { subscribe, getSnapshot, isPending };
}

export { createSharedRestCache, normalizeIds };
