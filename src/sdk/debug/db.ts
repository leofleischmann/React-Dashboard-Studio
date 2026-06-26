import { debugStore, type DebugLevel } from './store';

/**
 * Dashboard debug API. Output happens only when the engine is active
 * (integration option `debug_logs` + author 🐞 toggle, or `npm run dev` +
 * toggle); otherwise every call is a no-op, so `db` calls are safe to leave in
 * shipped dashboards.
 *
 *   import { db } from '@ha/debug';
 *
 *   const log = db.scope('HomePage');     // one logger per component/module
 *   log.info('sensors', sensors.length);  // → [db:HomePage] sensors 4
 *   log.scope('Chart').warn('no data');   // → [db:HomePage:Chart] no data
 *
 *   if (db.isEnabled()) expensiveDiagnostics();
 */

const label = (scope: string): string => `[db:${scope}]`;

/** Single guarded path for level output: buffer it, then mirror to the console. */
function emit(level: DebugLevel, scope: string, args: unknown[]): void {
  if (!debugStore.isActive()) return;
  debugStore.record(level, scope, args);
  // eslint no-console is disabled for this file (see eslint.config.js).
  console[level](label(scope), ...args);
}

/** A logger bound to a fixed scope. Methods mirror the `console` shape. */
export interface ScopedLogger {
  readonly scopeName: string;
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  /** Logs an error only when `condition` is falsy. */
  assert(condition: unknown, ...args: unknown[]): void;
  /** Renders tabular data inside a labelled group. */
  table(data: unknown, columns?: readonly string[]): void;
  group(groupLabel?: string): void;
  groupEnd(): void;
  time(timerLabel: string): void;
  timeEnd(timerLabel: string): void;
  /** Derives a nested logger, e.g. `db.scope('Home').scope('Chart')`. */
  scope(child: string): ScopedLogger;
}

function createLogger(scope: string): ScopedLogger {
  return {
    scopeName: scope,
    log: (...args) => emit('log', scope, args),
    info: (...args) => emit('info', scope, args),
    warn: (...args) => emit('warn', scope, args),
    error: (...args) => emit('error', scope, args),
    debug: (...args) => emit('debug', scope, args),
    assert: (condition, ...args) => {
      if (condition) return;
      emit('error', scope, ['Assertion failed:', ...args]);
    },
    table: (data, columns) => {
      if (!debugStore.isActive()) return;
      console.groupCollapsed(label(scope));
      console.table(data, columns as string[] | undefined);
      console.groupEnd();
    },
    group: (groupLabel) => {
      if (!debugStore.isActive()) return;
      console.groupCollapsed(`${label(scope)}${groupLabel ? ` ${groupLabel}` : ''}`);
    },
    groupEnd: () => {
      if (!debugStore.isActive()) return;
      console.groupEnd();
    },
    time: (timerLabel) => {
      if (!debugStore.isActive()) return;
      console.time(`${label(scope)} ${timerLabel}`);
    },
    timeEnd: (timerLabel) => {
      if (!debugStore.isActive()) return;
      console.timeEnd(`${label(scope)} ${timerLabel}`);
    },
    scope: (child) => createLogger(`${scope}:${child}`),
  };
}

export interface DebugApi {
  /** True when `db.*` would write to the console / buffer right now. */
  isEnabled(): boolean;
  /** Returns a logger bound to `name`. Nest further via the logger's `.scope()`. */
  scope(name: string): ScopedLogger;
}

export const db: DebugApi = {
  isEnabled: () => debugStore.isActive(),
  scope: (name) => createLogger(name),
};
