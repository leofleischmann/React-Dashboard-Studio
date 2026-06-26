import { debugStore, type DebugLevel } from './store';

/**
 * Dashboard debug API — logs only when the engine is active (integration option
 * `debug_logs` + author 🐞 toggle, or `npm run dev` + toggle). Every call is a
 * no-op otherwise, so it is safe to leave `db.*` calls in shipped dashboards.
 *
 * Two equivalent styles:
 *
 *   import { db } from '@ha/debug';
 *   db.log('HomePage', 'sensors', sensors.length);   // ad-hoc, pass scope each call
 *
 *   const log = db.scope('HomePage');                 // bound scope, less repetition
 *   log.log('sensors', sensors.length);
 *   log.scope('Chart').warn('no data');               // → [db:HomePage:Chart]
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

/** Ad-hoc debug API where the scope is the first argument of every call. */
export interface DebugApi {
  /** True when `db.*` would write to the console / buffer right now. */
  isEnabled(): boolean;
  /** Returns a logger bound to `name` (no scope arg on its methods). */
  scope(name: string): ScopedLogger;
  log(scope: string, ...args: unknown[]): void;
  info(scope: string, ...args: unknown[]): void;
  warn(scope: string, ...args: unknown[]): void;
  error(scope: string, ...args: unknown[]): void;
  debug(scope: string, ...args: unknown[]): void;
  assert(scope: string, condition: unknown, ...args: unknown[]): void;
  table(scope: string, data: unknown, columns?: readonly string[]): void;
  group(scope: string, groupLabel?: string): void;
  groupEnd(): void;
  time(scope: string, timerLabel: string): void;
  timeEnd(scope: string, timerLabel: string): void;
}

export const db: DebugApi = {
  isEnabled: () => debugStore.isActive(),
  scope: (name) => createLogger(name),
  log: (scope, ...args) => emit('log', scope, args),
  info: (scope, ...args) => emit('info', scope, args),
  warn: (scope, ...args) => emit('warn', scope, args),
  error: (scope, ...args) => emit('error', scope, args),
  debug: (scope, ...args) => emit('debug', scope, args),
  assert: (scope, condition, ...args) => createLogger(scope).assert(condition, ...args),
  table: (scope, data, columns) => createLogger(scope).table(data, columns),
  group: (scope, groupLabel) => createLogger(scope).group(groupLabel),
  groupEnd: () => {
    if (!debugStore.isActive()) return;
    console.groupEnd();
  },
  time: (scope, timerLabel) => createLogger(scope).time(timerLabel),
  timeEnd: (scope, timerLabel) => createLogger(scope).timeEnd(timerLabel),
};
