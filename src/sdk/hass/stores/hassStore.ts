import type { AppHass, HassEntity } from '../types';
import {
  createKeyedListeners,
  createListenerSet,
  type Listener,
} from '../../internal/listeners';

const EMPTY_ENTITIES: HassEntity[] = [];

function domainOf(entityId: string): string {
  const dot = entityId.indexOf('.');
  return dot === -1 ? entityId : entityId.slice(0, dot);
}

/**
 * External store for Home Assistant state. React hooks subscribe narrowly
 * (per entity, per domain, or all entities) so unrelated state changes do
 * not run every getSnapshot in the dashboard.
 */
class HassStore {
  private hass: AppHass | null = null;
  private narrow = false;
  private domainIndex = new Map<string, HassEntity[]>();

  /** Theme, dark mode, hass connection — not entity states. */
  private hassMetaListeners = createListenerSet();
  private narrowListeners = createListenerSet();
  /** Any entity state change (unscoped lists, entity browser, …). */
  private allEntitiesListeners = createListenerSet();
  private entityListeners = createKeyedListeners();
  private domainListeners = createKeyedListeners();

  private rebuildDomainIndex(states: Record<string, HassEntity> | undefined): void {
    const next = new Map<string, HassEntity[]>();
    if (states) {
      for (const id in states) {
        const domain = domainOf(id);
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

  private themeSignature(hass: AppHass | null): string {
    if (!hass) return '';
    const themeName =
      hass.themes?.theme ??
      (typeof hass.selectedTheme === 'object'
        ? hass.selectedTheme?.theme
        : hass.selectedTheme) ??
      '';
    const dark = hass.themes?.darkMode ?? hass.darkMode ?? '';
    return `${String(themeName)}\0${String(dark)}`;
  }

  private collectEntityChanges(
    prev: AppHass | null,
    next: AppHass,
  ): { entities: Set<string>; domains: Set<string>; bootstrap: boolean } {
    if (!prev) {
      return { entities: new Set(), domains: new Set(), bootstrap: true };
    }

    const entities = new Set<string>();
    const domains = new Set<string>();
    const prevStates = prev.states;
    const nextStates = next.states;

    if (prevStates !== nextStates) {
      for (const id in prevStates) {
        if (prevStates[id] !== nextStates[id]) {
          entities.add(id);
          domains.add(domainOf(id));
        }
      }
      for (const id in nextStates) {
        if (prevStates[id] !== nextStates[id]) {
          entities.add(id);
          domains.add(domainOf(id));
        }
      }
    }

    return { entities, domains, bootstrap: false };
  }

  private notifyAllEntityChannels(): void {
    this.allEntitiesListeners.notify();
    this.entityListeners.notifyAll();
    this.domainListeners.notifyAll();
  }

  private notifyEntityChanges(entities: Set<string>, domains: Set<string>): void {
    if (entities.size === 0) return;
    this.allEntitiesListeners.notify();
    for (const id of entities) this.entityListeners.notify(id);
    for (const domain of domains) this.domainListeners.notify(domain);
  }

  /** @deprecated Prefer the targeted subscribe* methods below. */
  subscribe = (listener: Listener): (() => void) =>
    this.subscribeAllEntities(listener);

  subscribeHassMeta = (listener: Listener): (() => void) =>
    this.hassMetaListeners.subscribe(listener);

  subscribeNarrow = (listener: Listener): (() => void) =>
    this.narrowListeners.subscribe(listener);

  subscribeAllEntities = (listener: Listener): (() => void) =>
    this.allEntitiesListeners.subscribe(listener);

  subscribeEntity = (entityId: string, listener: Listener): (() => void) =>
    this.entityListeners.subscribe(entityId, listener);

  subscribeDomain = (domain: string, listener: Listener): (() => void) =>
    this.domainListeners.subscribe(domain, listener);

  subscribeDomains = (
    domains: readonly string[] | '*',
    listener: Listener,
  ): (() => void) => {
    if (domains === '*') return this.subscribeAllEntities(listener);
    const unsubs = domains.map((domain) => this.subscribeDomain(domain, listener));
    return () => {
      for (const unsub of unsubs) unsub();
    };
  };

  /** Called by the panel (prod) or the dev harness whenever state changes. */
  setHass = (hass: AppHass): void => {
    const prev = this.hass;
    const metaChanged =
      !prev ||
      prev !== hass ||
      this.themeSignature(prev) !== this.themeSignature(hass);
    const { entities, domains, bootstrap } = this.collectEntityChanges(prev, hass);

    this.hass = hass;
    this.rebuildDomainIndex(hass.states);

    if (bootstrap) {
      this.hassMetaListeners.notify();
      this.notifyAllEntityChannels();
      return;
    }

    if (metaChanged) this.hassMetaListeners.notify();
    this.notifyEntityChanges(entities, domains);
  };

  getHass = (): AppHass | null => this.hass;

  setNarrow = (narrow: boolean): void => {
    if (this.narrow === narrow) return;
    this.narrow = narrow;
    this.narrowListeners.notify();
  };

  getNarrow = (): boolean => this.narrow;

  getEntity = (entityId: string): HassEntity | undefined =>
    this.hass?.states?.[entityId];

  getEntitiesByDomain = (domain: string): readonly HassEntity[] =>
    this.domainIndex.get(domain) ?? EMPTY_ENTITIES;

  getAllEntities = (): readonly HassEntity[] => {
    const states = this.hass?.states;
    if (!states) return EMPTY_ENTITIES;
    return Object.values(states);
  };

  callService = (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown> => {
    if (!this.hass) {
      return Promise.reject(
        new Error('[homeassistant-dashboard-studio] hass not ready yet'),
      );
    }
    return this.hass.callService(domain, service, serviceData, target);
  };
}

export const hassStore = new HassStore();
