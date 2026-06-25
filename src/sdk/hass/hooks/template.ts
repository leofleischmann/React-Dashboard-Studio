import {
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  getTemplateSnapshot,
  subscribeTemplate,
} from '../cachedTemplates';
import type {
  TemplateListeners,
  TemplateSnapshot,
} from '../templateTypes';
import {
  IDLE_TEMPLATE_SNAPSHOT,
  templateSnapshotsEqual,
} from '../templateTypes';
import { useHassReady } from './ready';

export interface UseTemplateOptions {
  /** Optional hint: HA invalidates only these entities. */
  entity_ids?: string[];
  /** Jinja variables, e.g. `{ name: 'Leo' }`. */
  variables?: Record<string, unknown>;
  /** Parse HA result (default: `string`). */
  parse?: 'string' | 'boolean' | 'number';
  strict?: boolean;
  report_errors?: boolean;
  timeout?: number;
}

export interface UseTemplateResult<T = string> {
  value: T | undefined;
  loading: boolean;
  error: string | undefined;
  /** Raw string from HA (always present when ready). */
  raw: string | undefined;
  listeners?: TemplateListeners;
}

const EMPTY_TEMPLATE_RESULT: UseTemplateResult = {
  value: undefined,
  loading: false,
  error: undefined,
  raw: undefined,
};

const LOADING_TEMPLATE_RESULT: UseTemplateResult = {
  value: undefined,
  loading: true,
  error: undefined,
  raw: undefined,
};

function stableEntityIdsKey(entityIds?: string[]): string {
  if (!entityIds?.length) return '';
  return [...entityIds].sort().join(',');
}

function stableVariablesKey(variables?: Record<string, unknown>): string {
  if (!variables) return '';
  return JSON.stringify(variables, Object.keys(variables).sort());
}

function parseTemplateValue(
  raw: string,
  parse: 'string' | 'boolean' | 'number',
): { value: string | boolean | number | undefined; error?: string } {
  if (parse === 'string') return { value: raw };

  if (parse === 'boolean') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return { value: true };
    if (normalized === 'false' || normalized === '0') return { value: false };
    return {
      value: undefined,
      error: `Template-Boolean ungültig: "${raw}"`,
    };
  }

  const n = Number.parseFloat(raw.trim());
  if (Number.isNaN(n)) {
    return {
      value: undefined,
      error: `Template-Zahl ungültig: "${raw}"`,
    };
  }
  return { value: n };
}

function mapTemplateSnapshot<T>(
  snapshot: TemplateSnapshot,
  parse: 'string' | 'boolean' | 'number',
): UseTemplateResult<T> {
  if (snapshot.status === 'idle') return EMPTY_TEMPLATE_RESULT as UseTemplateResult<T>;
  if (snapshot.status === 'loading') {
    return LOADING_TEMPLATE_RESULT as UseTemplateResult<T>;
  }
  if (snapshot.status === 'error') {
    return {
      value: undefined,
      loading: false,
      error: snapshot.error.message,
      raw: undefined,
    } as UseTemplateResult<T>;
  }

  const raw = snapshot.result.value;
  const parsed = parseTemplateValue(raw, parse);
  if (parsed.error) {
    return {
      value: undefined,
      loading: false,
      error: parsed.error,
      raw,
      listeners: snapshot.result.listeners,
    } as UseTemplateResult<T>;
  }

  return {
    value: parsed.value as T,
    loading: false,
    error: undefined,
    raw,
    listeners: snapshot.result.listeners,
  } as UseTemplateResult<T>;
}

/**
 * Evaluate a Home Assistant Jinja2 template live via WebSocket.
 * Uses HA's server-side engine — conditions, calculations, formatting.
 *
 *   const { value } = useTemplate("{{ states('sensor.temp') | float | round(1) }}");
 *   const warm = useTemplate("{{ states('sensor.temp') | float > 20 }}", { parse: 'boolean' });
 */
export function useTemplate<T = string>(
  template: string,
  options: UseTemplateOptions = {},
): UseTemplateResult<T> {
  const {
    entity_ids,
    variables,
    parse = 'string',
    strict,
    report_errors,
    timeout,
  } = options;

  const ready = useHassReady();
  const trimmed = template.trim();
  const entityIdsKey = stableEntityIdsKey(entity_ids);
  const variablesKey = stableVariablesKey(variables);

  const subscriptionOptions = useMemo(
    () => ({
      template: trimmed,
      entity_ids,
      variables,
      strict,
      report_errors,
      timeout,
    }),
    [trimmed, entityIdsKey, variablesKey, strict, report_errors, timeout],
  );

  const snapshotCacheRef = useRef<TemplateSnapshot>(IDLE_TEMPLATE_SNAPSHOT);

  const getSnapshot = useCallback(() => {
    if (!ready || !trimmed) return IDLE_TEMPLATE_SNAPSHOT;
    const next = getTemplateSnapshot(subscriptionOptions);
    const prev = snapshotCacheRef.current;
    if (templateSnapshotsEqual(prev, next)) return prev;
    snapshotCacheRef.current = next;
    return next;
  }, [ready, trimmed, subscriptionOptions]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ready || !trimmed) return () => {};
      return subscribeTemplate(subscriptionOptions, listener);
    },
    [ready, trimmed, subscriptionOptions],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => IDLE_TEMPLATE_SNAPSHOT,
  );

  const result = useMemo(
    () => mapTemplateSnapshot<T>(snapshot, parse),
    [snapshot, parse],
  );

  if (!ready && trimmed) {
    return LOADING_TEMPLATE_RESULT as UseTemplateResult<T>;
  }

  return result;
}

export type { TemplateListeners };
