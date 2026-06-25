import { hassStore } from './store';

type Listener = () => void;

type EntityRegistryRow = {
  entity_id: string;
  area_id: string | null;
};

type AreaRegistryRow = {
  area_id: string;
  name: string;
};

/**
 * Cached HA entity/area registry for area-based filtering.
 * Loaded once over the WebSocket when first needed.
 */
class RegistryStore {
  private entityArea = new Map<string, string>();
  private areaNames = new Map<string, string>();
  private status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  private loadPromise: Promise<void> | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify = (): void => {
    for (const listener of this.listeners) listener();
  };

  getStatus = (): 'idle' | 'loading' | 'ready' | 'error' => this.status;

  getEntityArea = (entityId: string): string | undefined =>
    this.entityArea.get(entityId);

  getAreaName = (areaId: string): string | undefined =>
    this.areaNames.get(areaId);

  /** Returns entity IDs belonging to an area (empty until registry is loaded). */
  getEntitiesInArea = (areaId: string): string[] => {
    const out: string[] = [];
    for (const [entityId, id] of this.entityArea) {
      if (id === areaId) out.push(entityId);
    }
    return out;
  };

  ensureLoaded = (): void => {
    if (this.status === 'ready' || this.status === 'loading') return;

    const connection = hassStore.getHass()?.connection;
    if (!connection) return;

    this.status = 'loading';
    this.loadPromise ??= Promise.all([
      connection.sendMessagePromise<EntityRegistryRow[]>({
        type: 'config/entity_registry/list',
      }),
      connection.sendMessagePromise<AreaRegistryRow[]>({
        type: 'config/area_registry/list',
      }),
    ])
      .then(([entities, areas]) => {
        this.entityArea.clear();
        for (const row of entities) {
          if (row.area_id) this.entityArea.set(row.entity_id, row.area_id);
        }
        this.areaNames.clear();
        for (const row of areas) {
          this.areaNames.set(row.area_id, row.name);
        }
        this.status = 'ready';
        this.notify();
      })
      .catch(() => {
        this.status = 'error';
        this.notify();
      })
      .finally(() => {
        this.loadPromise = null;
      });
  };
}

export const registryStore = new RegistryStore();
