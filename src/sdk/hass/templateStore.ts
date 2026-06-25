import { hassStore } from './store';
import type { HassConnection } from './types';
import type {
  RenderTemplateMessage,
  TemplateSnapshot,
  TemplateSubscriptionOptions,
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
      console.log('[Debug templateStore]: connection changed, resubscribing active templates');
      this.lastConnection = connection;
      this.resubscribeAll();
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
    return this.buckets.get(key)?.snapshot ?? { status: 'idle' };
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
        snapshot: { status: 'loading' },
        reactListeners: new Set(),
        wsUnsub: null,
        wsPending: false,
      };
      this.buckets.set(key, bucket);
    }

    bucket.reactListeners.add(listener);
    console.log(
      '[Debug templateStore]: subscribe',
      key.slice(0, 48),
      'refs=',
      bucket.reactListeners.size,
    );

    void this.ensureWsSubscribe(bucket);

    return () => {
      bucket!.reactListeners.delete(listener);
      console.log(
        '[Debug templateStore]: unsubscribe',
        key.slice(0, 48),
        'refs=',
        bucket!.reactListeners.size,
      );
      if (bucket!.reactListeners.size === 0) {
        bucket!.wsUnsub?.();
        this.buckets.delete(key);
        console.log(
          '[Debug templateStore]: active buckets=',
          this.buckets.size,
        );
      }
    };
  }

  private resubscribeAll(): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.reactListeners.size === 0) continue;
      bucket.wsUnsub?.();
      bucket.wsUnsub = null;
      bucket.wsPending = false;
      bucket.snapshot = { status: 'loading' };
      notifyBucket(bucket);
      void this.ensureWsSubscribe(bucket);
    }
  }

  private async ensureWsSubscribe(bucket: TemplateBucket): Promise<void> {
    if (bucket.wsPending || bucket.wsUnsub) return;

    const connection = hassStore.getHass()?.connection;
    if (!connection?.subscribeMessage) {
      bucket.snapshot = {
        status: 'error',
        error: {
          message: 'WebSocket-Verbindung nicht verfügbar',
          level: 'ERROR',
        },
      };
      notifyBucket(bucket);
      return;
    }

    bucket.wsPending = true;
    if (bucket.snapshot.status !== 'ready') {
      bucket.snapshot = { status: 'loading' };
      notifyBucket(bucket);
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
      console.log(
        '[Debug templateStore]: ws subscribed',
        bucket.key.slice(0, 48),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Template-Subscription fehlgeschlagen';
      console.log('[Debug templateStore]: ws error', message);
      bucket.snapshot = {
        status: 'error',
        error: { message, level: 'ERROR' },
      };
      notifyBucket(bucket);
    } finally {
      bucket.wsPending = false;
    }
  }

  private handleMessage(
    bucket: TemplateBucket,
    msg: RenderTemplateMessage,
  ): void {
    if ('error' in msg) {
      console.log('[Debug templateStore]: template error', msg.error);
      bucket.snapshot = {
        status: 'error',
        error: { message: msg.error, level: msg.level },
      };
    } else {
      console.log(
        '[Debug templateStore]: template result',
        msg.result.slice(0, 80),
        'entities=',
        msg.listeners?.entities?.length ?? 0,
      );
      bucket.snapshot = {
        status: 'ready',
        result: {
          value: msg.result,
          listeners: msg.listeners,
        },
      };
    }
    notifyBucket(bucket);
  }
}

export const templateStore = new TemplateStore();
