/** Which entities/domains/time HA watches for a live template subscription. */
export interface TemplateListeners {
  all: boolean;
  domains: string[];
  entities: string[];
  time: boolean;
}

export interface TemplateResult {
  value: string;
  listeners?: TemplateListeners;
}

export interface TemplateError {
  message: string;
  level: 'ERROR' | 'WARNING';
}

export type TemplateSnapshot =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: TemplateResult }
  | { status: 'error'; error: TemplateError };

export interface TemplateSubscriptionOptions {
  template: string;
  entity_ids?: string[];
  variables?: Record<string, unknown>;
  timeout?: number;
  strict?: boolean;
  report_errors?: boolean;
}

/** Successful push from HA WebSocket `render_template`. */
export interface RenderTemplateResult {
  result: string;
  listeners: TemplateListeners;
}

/** Error push from HA WebSocket `render_template`. */
export interface RenderTemplateError {
  error: string;
  level: 'ERROR' | 'WARNING';
}

export type RenderTemplateMessage = RenderTemplateResult | RenderTemplateError;

/** Stable snapshot singletons for useSyncExternalStore. */
export const IDLE_TEMPLATE_SNAPSHOT: TemplateSnapshot = { status: 'idle' };
export const LOADING_TEMPLATE_SNAPSHOT: TemplateSnapshot = { status: 'loading' };

export function templateSnapshotsEqual(
  a: TemplateSnapshot,
  b: TemplateSnapshot,
): boolean {
  if (a === b) return true;
  if (a.status !== b.status) return false;
  if (a.status === 'idle' || a.status === 'loading') return true;
  if (a.status === 'error' && b.status === 'error') {
    return (
      a.error.message === b.error.message && a.error.level === b.error.level
    );
  }
  if (a.status === 'ready' && b.status === 'ready') {
    return (
      a.result.value === b.result.value &&
      a.result.listeners === b.result.listeners
    );
  }
  return false;
}
