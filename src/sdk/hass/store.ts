import type { AppHass, HassEntity } from './types';

type Listener = () => void;

const EMPTY_ENTITIES: HassEntity[] = [];

function addKeyedListener(
  map: Map<string, Set<Listener>>,
  key: string,
  listener: Listener,
): () => void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) map.delete(key);
  };
}

function notifySet(set: Set<Listener> | undefined): void {
  if (!set) return;
  for (const listener of set) listener();
}

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
  private hassMetaListeners = new Set<Listener>();
  private narrowListeners = new Set<Listener>();
  /** Any entity state change (unscoped lists, entity browser, …). */
  private allEntitiesListeners = new Set<Listener>();
  private entityListeners = new Map<string, Set<Listener>>();
  private domainListeners = new Map<string, Set<Listener>>();

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
    notifySet(this.allEntitiesListeners);
    for (const set of this.entityListeners.values()) notifySet(set);
    for (const set of this.domainListeners.values()) notifySet(set);
  }

  private notifyEntityChanges(entities: Set<string>, domains: Set<string>): void {
    if (entities.size === 0) return;
    notifySet(this.allEntitiesListeners);
    for (const id of entities) notifySet(this.entityListeners.get(id));
    for (const domain of domains) notifySet(this.domainListeners.get(domain));
  }

  /** @deprecated Prefer the targeted subscribe* methods below. */
  subscribe = (listener: Listener): (() => void) =>
    this.subscribeAllEntities(listener);

  subscribeHassMeta = (listener: Listener): (() => void) => {
    this.hassMetaListeners.add(listener);
    return () => {
      this.hassMetaListeners.delete(listener);
    };
  };

  subscribeNarrow = (listener: Listener): (() => void) => {
    this.narrowListeners.add(listener);
    return () => {
      this.narrowListeners.delete(listener);
    };
  };

  subscribeAllEntities = (listener: Listener): (() => void) => {
    this.allEntitiesListeners.add(listener);
    return () => {
      this.allEntitiesListeners.delete(listener);
    };
  };

  subscribeEntity = (entityId: string, listener: Listener): (() => void) =>
    addKeyedListener(this.entityListeners, entityId, listener);

  subscribeDomain = (domain: string, listener: Listener): (() => void) =>
    addKeyedListener(this.domainListeners, domain, listener);

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
      notifySet(this.hassMetaListeners);
      this.notifyAllEntityChannels();
      return;
    }

    if (metaChanged) notifySet(this.hassMetaListeners);
    this.notifyEntityChanges(entities, domains);
  };

  getHass = (): AppHass | null => this.hass;

  setNarrow = (narrow: boolean): void => {
    if (this.narrow === narrow) return;
    this.narrow = narrow;
    notifySet(this.narrowListeners);
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
