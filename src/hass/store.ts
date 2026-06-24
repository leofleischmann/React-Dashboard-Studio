import type { AppHass, HassEntity } from './types';

type Listener = () => void;

const EMPTY_ENTITIES: HassEntity[] = [];

/**
 * A tiny external store that holds the current `hass` object and lets React
 * components subscribe to it via useSyncExternalStore.
 *
 * Why this exists: HA replaces `hass.states` on EVERY state change of ANY
 * entity. Reading it naively would re-render the whole dashboard constantly.
 * Instead, each hook subscribes here and returns a per-entity snapshot.
 * Because HA keeps the object reference of unchanged entities stable,
 * useSyncExternalStore bails out of re-rendering components whose specific
 * entity did not change — even though every listener is pinged.
 */
class HassStore {
  private hass: AppHass | null = null;
  private narrow = false;
  private listeners = new Set<Listener>();
  private domainIndex = new Map<string, HassEntity[]>();

  private rebuildDomainIndex(states: Record<string, HassEntity> | undefined): void {
    const next = new Map<string, HassEntity[]>();
    if (states) {
      for (const id in states) {
        const dot = id.indexOf('.');
        if (dot === -1) continue;
        const domain = id.slice(0, dot);
        let list = next.get(domain);
        if (!list) {
          list = [];
          next.set(domain, list);
        }
        list.push(states[id]);
      }
    }
    this.domainIndex = next;
  }

  /** Called by the panel (prod) or the dev harness whenever state changes. */
  setHass = (hass: AppHass): void => {
    this.hass = hass;
    this.rebuildDomainIndex(hass.states);
    for (const listener of this.listeners) listener();
  };

  getHass = (): AppHass | null => this.hass;

  /** HA tells the panel whether it is rendered in a narrow (mobile) layout. */
  setNarrow = (narrow: boolean): void => {
    if (this.narrow === narrow) return;
    this.narrow = narrow;
    for (const listener of this.listeners) listener();
  };

  getNarrow = (): boolean => this.narrow;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getEntity = (entityId: string): HassEntity | undefined =>
    this.hass?.states?.[entityId];

  /** O(1) lookup of all entities in a domain (rebuilt on each hass update). */
  getEntitiesByDomain = (domain: string): readonly HassEntity[] =>
    this.domainIndex.get(domain) ?? EMPTY_ENTITIES;

  callService = (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown> => {
    if (!this.hass) {
      return Promise.reject(
        new Error('[react-dashboard-studio] hass not ready yet'),
      );
    }
    return this.hass.callService(domain, service, serviceData, target);
  };
}

export const hassStore = new HassStore();
