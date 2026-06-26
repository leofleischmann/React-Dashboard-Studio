import { debugStore } from './store';

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

function emit(level: ConsoleLevel, scope: string, args: unknown[]): void {
  if (!debugStore.isActive()) return;
  const label = `[db:${scope}]`;
  console[level](label, ...args);
}

/**
 * Dashboard debug API — logs only when enabled (integration option + author toggle).
 *
 *   import { db } from '@ha/debug';
 *   db.log('HomePage', 'sensors', sensors.length);
 */
export const db = {
  isEnabled(): boolean {
    return debugStore.isActive();
  },

  log(scope: string, ...args: unknown[]): void {
    emit('log', scope, args);
  },

  info(scope: string, ...args: unknown[]): void {
    emit('info', scope, args);
  },

  warn(scope: string, ...args: unknown[]): void {
    emit('warn', scope, args);
  },

  error(scope: string, ...args: unknown[]): void {
    emit('error', scope, args);
  },

  debug(scope: string, ...args: unknown[]): void {
    emit('debug', scope, args);
  },

  group(scope: string, label?: string): void {
    if (!debugStore.isActive()) return;
    console.groupCollapsed(`[db:${scope}]${label ? ` ${label}` : ''}`);
  },

  groupEnd(): void {
    if (!debugStore.isActive()) return;
    console.groupEnd();
  },

  time(scope: string, label: string): void {
    if (!debugStore.isActive()) return;
    console.time(`[db:${scope}] ${label}`);
  },

  timeEnd(scope: string, label: string): void {
    if (!debugStore.isActive()) return;
    console.timeEnd(`[db:${scope}] ${label}`);
  },
};
