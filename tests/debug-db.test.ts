import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/sdk/debug/db';
import { applyIntegrationSettings, debugStore } from '../src/sdk/debug/store';

describe('db debug engine', () => {
  afterEach(() => {
    debugStore.setIntegrationEnabled(false);
    debugStore.setAuthorEnabled(true);
    debugStore.clearEntries();
    vi.restoreAllMocks();
  });

  it('logs in local dev even when integration debug is off', () => {
    debugStore.setIntegrationEnabled(false);
    debugStore.setAuthorEnabled(true);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.scope('Test').log('hello');
    expect(spy).toHaveBeenCalledWith('[db:Test]', 'hello');
  });

  it('logs with [db:scope] when integration and author toggles are on', () => {
    debugStore.setIntegrationEnabled(true);
    debugStore.setAuthorEnabled(true);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.scope('ChartsPage').log('loaded', 3);
    expect(spy).toHaveBeenCalledWith('[db:ChartsPage]', 'loaded', 3);
  });

  it('is silent when integration debug is on but author toggle is off (prod default)', () => {
    debugStore.setIntegrationEnabled(true);
    debugStore.setAuthorEnabled(false);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.scope('Test').log('nope');
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
    const log = db.scope('Scope');
    log.warn('careful');
    log.error(new Error('boom'));
    expect(warnSpy).toHaveBeenCalledWith('[db:Scope]', 'careful');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('nests scopes with ":"', () => {
    debugStore.setAuthorEnabled(true);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = db.scope('HomePage');
    log.log('ready');
    log.scope('Chart').log('drawn');
    expect(spy).toHaveBeenNthCalledWith(1, '[db:HomePage]', 'ready');
    expect(spy).toHaveBeenNthCalledWith(2, '[db:HomePage:Chart]', 'drawn');
  });

  it('assert logs an error only when the condition is falsy', () => {
    debugStore.setAuthorEnabled(true);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = db.scope('Scope');
    log.assert(true, 'should not log');
    expect(errorSpy).not.toHaveBeenCalled();
    log.assert(false, 'value missing');
    expect(errorSpy).toHaveBeenCalledWith('[db:Scope]', 'Assertion failed:', 'value missing');
  });

  it('captures entries into the ring buffer while active, but not when silent', () => {
    debugStore.setAuthorEnabled(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    db.scope('HomePage').log('hello', 1);
    const entries = debugStore.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ level: 'log', scope: 'HomePage', args: ['hello', 1] });

    debugStore.setAuthorEnabled(false);
    db.scope('HomePage').log('ignored');
    expect(debugStore.getEntries()).toHaveLength(1);
  });

  it('clearEntries empties the buffer', () => {
    debugStore.setAuthorEnabled(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    db.scope('Scope').log('x');
    expect(debugStore.getEntries().length).toBeGreaterThan(0);
    debugStore.clearEntries();
    expect(debugStore.getEntries()).toHaveLength(0);
  });
});
