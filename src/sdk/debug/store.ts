type Listener = () => void;

const AUTHOR_DEBUG_KEY = 'homeassistant_dashboard_studio:author_debug';

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
 * Debug output is allowed when:
 * - `npm run dev` and the author toggle is on, or
 * - integration option `debug_logs` is on and the author toggle is on.
 */
class DebugStore {
  private integrationEnabled = false;
  private authorEnabled = readAuthorEnabled();
  private listeners = new Set<Listener>();

  setIntegrationEnabled(enabled: boolean): void {
    if (this.integrationEnabled === enabled) return;
    this.integrationEnabled = enabled;
    this.notify();
  }

  getIntegrationEnabled(): boolean {
    return this.integrationEnabled;
  }

  setAuthorEnabled(enabled: boolean): void {
    if (this.authorEnabled === enabled) return;
    this.authorEnabled = enabled;
    writeAuthorEnabled(enabled);
    this.notify();
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
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
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
