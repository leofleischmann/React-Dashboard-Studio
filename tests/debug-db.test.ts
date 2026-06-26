import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/sdk/debug/db';
import { debugStore } from '../src/sdk/debug/store';

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

  it('is silent when author toggle is off', () => {
    debugStore.setIntegrationEnabled(true);
    debugStore.setAuthorEnabled(false);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    db.log('Test', 'nope');
    expect(spy).not.toHaveBeenCalled();
  });
});
