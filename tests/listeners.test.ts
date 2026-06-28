import { describe, it, expect } from 'vitest';
import {
  createListenerSet,
  createKeyedListeners,
} from '../src/sdk/internal/listeners';

describe('createListenerSet', () => {
  it('notifies every subscriber in insertion order', () => {
    const set = createListenerSet();
    const order: number[] = [];
    set.subscribe(() => order.push(1));
    set.subscribe(() => order.push(2));
    set.notify();
    expect(order).toEqual([1, 2]);
  });

  it('stops notifying after unsubscribe and tracks size', () => {
    const set = createListenerSet();
    let calls = 0;
    const off = set.subscribe(() => calls++);
    expect(set.size).toBe(1);
    set.notify();
    off();
    expect(set.size).toBe(0);
    set.notify();
    expect(calls).toBe(1);
  });
});

describe('createKeyedListeners', () => {
  it('notifies only listeners of the given key', () => {
    const keyed = createKeyedListeners();
    let a = 0;
    let b = 0;
    keyed.subscribe('a', () => a++);
    keyed.subscribe('b', () => b++);
    keyed.notify('a');
    expect([a, b]).toEqual([1, 0]);
  });

  it('notifyAll hits every key', () => {
    const keyed = createKeyedListeners();
    let total = 0;
    keyed.subscribe('a', () => total++);
    keyed.subscribe('b', () => total++);
    keyed.notifyAll();
    expect(total).toBe(2);
  });

  it('drops a key once its last listener unsubscribes', () => {
    const keyed = createKeyedListeners();
    const off1 = keyed.subscribe('k', () => {});
    const off2 = keyed.subscribe('k', () => {});
    expect(keyed.size('k')).toBe(2);
    off1();
    expect(keyed.size('k')).toBe(1);
    off2();
    expect(keyed.size('k')).toBe(0);
    // a fresh notify on a dropped key is a no-op (no throw)
    expect(() => keyed.notify('k')).not.toThrow();
  });
});
