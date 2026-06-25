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
