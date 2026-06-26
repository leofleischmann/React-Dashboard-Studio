type Listener = () => void;

const AUTHOR_DEBUG_KEY = 'homeassistant_dashboard_studio:author_debug';

/** Console levels the debug engine mirrors into its in-app buffer. */
export type DebugLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/** A single captured log line — used by the in-app log viewer (`useDebugLog`). */
export interface DebugEntry {
  readonly id: number;
  readonly level: DebugLevel;
  readonly scope: string;
  readonly args: readonly unknown[];
  readonly time: number;
}

/** How many recent entries the ring buffer keeps. */
const MAX_ENTRIES = 200;

function readAuthorEnabled(): boolean {
  const fallback = import.meta.env.DEV;
  if (typeof sessionStorage === 'undefined') return fallback;
  const raw = sessionStorage.getItem(AUTHOR_DEBUG_KEY);
  if (raw === null) return fallback;
  return raw === '1';
}

function writeAuthorEnabled(enabled: boolean): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(AUTHOR_DEBUG_KEY, enabled ? '1' : '0');
}

/**
 * Single source of truth for the debug engine.
 *
 * Output is *active* when:
 * - `npm run dev` and the author toggle is on, or
 * - integration option `debug_logs` is on and the author toggle is on.
 *
 * State changes (`subscribe`) and captured log entries (`subscribeEntries`) are
 * tracked separately so a log viewer can re-render on new lines without waking
 * up the toolbar toggle, and vice versa.
 */
class DebugStore {
  private integrationEnabled = false;
  private authorEnabled = readAuthorEnabled();
  private stateListeners = new Set<Listener>();

  private entries: readonly DebugEntry[] = [];
  private entryListeners = new Set<Listener>();
  private nextId = 1;

  // --- gates -------------------------------------------------------------

  setIntegrationEnabled(enabled: boolean): void {
    if (this.integrationEnabled === enabled) return;
    this.integrationEnabled = enabled;
    this.notifyState();
  }

  getIntegrationEnabled(): boolean {
    return this.integrationEnabled;
  }

  setAuthorEnabled(enabled: boolean): void {
    if (this.authorEnabled === enabled) return;
    this.authorEnabled = enabled;
    writeAuthorEnabled(enabled);
    this.notifyState();
  }

  getAuthorEnabled(): boolean {
    return this.authorEnabled;
  }

  isActive(): boolean {
    if (!this.authorEnabled) return false;
    if (import.meta.env.DEV) return true;
    return this.integrationEnabled;
  }

  subscribe(listener: Listener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  // --- log buffer --------------------------------------------------------

  /** Append a captured line to the ring buffer. Caller guards on `isActive()`. */
  record(level: DebugLevel, scope: string, args: readonly unknown[]): void {
    const entry: DebugEntry = { id: this.nextId++, level, scope, args, time: Date.now() };
    const next = [...this.entries, entry];
    if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES);
    this.entries = next;
    this.notifyEntries();
  }

  getEntries(): readonly DebugEntry[] {
    return this.entries;
  }

  clearEntries(): void {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.notifyEntries();
  }

  subscribeEntries(listener: Listener): () => void {
    this.entryListeners.add(listener);
    return () => this.entryListeners.delete(listener);
  }

  // --- internals ---------------------------------------------------------

  private notifyState(): void {
    for (const listener of this.stateListeners) listener();
  }

  private notifyEntries(): void {
    for (const listener of this.entryListeners) listener();
  }
}

export const debugStore = new DebugStore();

export type IntegrationSettingsMessage = {
  debug_logs?: boolean;
};

export function applyIntegrationSettings(msg: IntegrationSettingsMessage | undefined): void {
  if (typeof msg?.debug_logs === 'boolean') {
    debugStore.setIntegrationEnabled(msg.debug_logs);
  }
}
