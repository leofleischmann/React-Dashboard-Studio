import { hassStore } from './store';
import type { HassConnection } from './types';
import type {
  RenderTemplateMessage,
  TemplateSnapshot,
  TemplateSubscriptionOptions,
} from './templateTypes';
import {
  IDLE_TEMPLATE_SNAPSHOT,
  LOADING_TEMPLATE_SNAPSHOT,
  normalizeTemplateResult,
  templateSnapshotsEqual,
} from './templateTypes';

type Listener = () => void;

interface TemplateBucket {
  key: string;
  options: TemplateSubscriptionOptions;
  snapshot: TemplateSnapshot;
  reactListeners: Set<Listener>;
  wsUnsub: (() => void) | null;
  wsPending: boolean;
}

function notifyBucket(bucket: TemplateBucket): void {
  for (const listener of bucket.reactListeners) listener();
}

function setBucketSnapshot(
  bucket: TemplateBucket,
  next: TemplateSnapshot,
): void {
  if (templateSnapshotsEqual(bucket.snapshot, next)) return;
  bucket.snapshot = next;
  notifyBucket(bucket);
}

function defaultReportErrors(): boolean {
  return Boolean(import.meta.env.DEV);
}

class TemplateStore {
  private buckets = new Map<string, TemplateBucket>();
  private lastConnection: HassConnection | undefined;

  constructor() {
    hassStore.subscribeHassMeta(() => {
      const connection = hassStore.getHass()?.connection;
      if (connection === this.lastConnection) return;
      const hadConnection = this.lastConnection !== undefined;
      this.lastConnection = connection;
      if (hadConnection && this.buckets.size > 0) {
        this.resubscribeAll();
      }
    });
  }

  cacheKey(options: TemplateSubscriptionOptions): string {
    const entityIds = options.entity_ids
      ? [...options.entity_ids].sort().join(',')
      : '';
    const variables = options.variables
      ? JSON.stringify(
          options.variables,
          Object.keys(options.variables).sort(),
        )
      : '';
    return [
      options.template,
      entityIds,
      variables,
      String(options.strict ?? false),
      String(options.report_errors ?? defaultReportErrors()),
      String(options.timeout ?? ''),
    ].join('\0');
  }

  getSnapshot(key: string): TemplateSnapshot {
    return this.buckets.get(key)?.snapshot ?? IDLE_TEMPLATE_SNAPSHOT;
  }

  subscribe(
    key: string,
    options: TemplateSubscriptionOptions,
    listener: Listener,
  ): () => void {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        options,
        snapshot: LOADING_TEMPLATE_SNAPSHOT,
        reactListeners: new Set(),
        wsUnsub: null,
        wsPending: false,
      };
      this.buckets.set(key, bucket);
    }

    bucket.reactListeners.add(listener);

    void this.ensureWsSubscribe(bucket);

    return () => {
      bucket!.reactListeners.delete(listener);
      if (bucket!.reactListeners.size === 0) {
        bucket!.wsUnsub?.();
        this.buckets.delete(key);
      }
    };
  }

  private resubscribeAll(): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.reactListeners.size === 0) continue;
      bucket.wsUnsub?.();
      bucket.wsUnsub = null;
      bucket.wsPending = false;
      setBucketSnapshot(bucket, LOADING_TEMPLATE_SNAPSHOT);
      void this.ensureWsSubscribe(bucket);
    }
  }

  private async ensureWsSubscribe(bucket: TemplateBucket): Promise<void> {
    if (bucket.wsPending || bucket.wsUnsub) return;

    const connection = hassStore.getHass()?.connection;
    if (!connection?.subscribeMessage) {
      setBucketSnapshot(bucket, {
        status: 'error',
        error: {
          message: 'WebSocket-Verbindung nicht verfügbar',
          level: 'ERROR',
        },
      });
      return;
    }

    bucket.wsPending = true;
    if (bucket.snapshot.status !== 'ready') {
      setBucketSnapshot(bucket, LOADING_TEMPLATE_SNAPSHOT);
    }

    const reportErrors =
      bucket.options.report_errors ?? defaultReportErrors();

    try {
      const unsub = await connection.subscribeMessage<RenderTemplateMessage>(
        (msg) => this.handleMessage(bucket, msg),
        {
          type: 'render_template',
          template: bucket.options.template,
          ...(bucket.options.entity_ids?.length
            ? { entity_ids: bucket.options.entity_ids }
            : {}),
          ...(bucket.options.variables
            ? { variables: bucket.options.variables }
            : {}),
          ...(bucket.options.timeout !== undefined
            ? { timeout: bucket.options.timeout }
            : {}),
          ...(bucket.options.strict ? { strict: true } : {}),
          report_errors: reportErrors,
        },
      );

      if (bucket.reactListeners.size === 0) {
        unsub();
        return;
      }

      bucket.wsUnsub = unsub;
      this.lastConnection = connection;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Template-Subscription fehlgeschlagen';
      setBucketSnapshot(bucket, {
        status: 'error',
        error: { message, level: 'ERROR' },
      });
    } finally {
      bucket.wsPending = false;
    }
  }

  private handleMessage(
    bucket: TemplateBucket,
    msg: RenderTemplateMessage,
  ): void {
    if ('error' in msg) {
      setBucketSnapshot(bucket, {
        status: 'error',
        error: { message: msg.error, level: msg.level },
      });
    } else {
      const value = normalizeTemplateResult(msg.result);
      setBucketSnapshot(bucket, {
        status: 'ready',
        result: {
          value,
          listeners: msg.listeners,
        },
      });
    }
  }
}

export const templateStore = new TemplateStore();
