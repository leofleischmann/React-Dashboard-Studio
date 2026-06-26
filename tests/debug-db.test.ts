import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/sdk/debug/db';
import { applyIntegrationSettings, debugStore } from '../src/sdk/debug/store';

describe('db debug engine', () => {
  afterEach(() => {
    debugStore.setIntegrationEnabled(false);
    debugStore.setAuthorEnabled(true);
    vi.restoreAllMocks();
  });

  it('logs in local dev even when integration debug is off', () => {
    debugStore.setIntegrationEnabled(false);
    debugStore.setAuthorEnabled(true);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.log('Test', 'hello');
    expect(spy).toHaveBeenCalledWith('[db:Test]', 'hello');
  });

  it('logs with [db:scope] when integration and author toggles are on', () => {
    debugStore.setIntegrationEnabled(true);
    debugStore.setAuthorEnabled(true);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.log('ChartsPage', 'loaded', 3);
    expect(spy).toHaveBeenCalledWith('[db:ChartsPage]', 'loaded', 3);
  });

  it('is silent when integration debug is on but author toggle is off (prod default)', () => {
    debugStore.setIntegrationEnabled(true);
    debugStore.setAuthorEnabled(false);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.log('Test', 'nope');
    expect(spy).not.toHaveBeenCalled();
    expect(debugStore.isActive()).toBe(false);
  });

  it('applyIntegrationSettings updates integration flag from websocket payload', () => {
    applyIntegrationSettings({ debug_logs: true });
    expect(debugStore.getIntegrationEnabled()).toBe(true);
    applyIntegrationSettings({ debug_logs: false });
    expect(debugStore.getIntegrationEnabled()).toBe(false);
  });

  it('warn and error use console methods allowed by eslint policy', () => {
    debugStore.setIntegrationEnabled(true);
    debugStore.setAuthorEnabled(true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.warn('Scope', 'careful');
    db.error('Scope', new Error('boom'));
    expect(warnSpy).toHaveBeenCalledWith('[db:Scope]', 'careful');
    expect(errorSpy).toHaveBeenCalled();
  });
});
