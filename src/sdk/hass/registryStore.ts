import { hassStore } from './store';

type Listener = () => void;

export type EntityRegistryEntry = {
  entity_id: string;
  name: string | null;
  icon: string | null;
  area_id: string | null;
  labels: string[];
  hidden: boolean;
  disabled: boolean;
};

export type AreaEntry = {
  area_id: string;
  name: string;
};

export type LabelEntry = {
  label_id: string;
  name: string;
};

type EntityRegistryRow = {
  entity_id: string;
  name: string | null;
  icon: string | null;
  area_id: string | null;
  labels?: string[];
  hidden_by?: string | null;
  disabled_by?: string | null;
};

type AreaRegistryRow = {
  area_id: string;
  name: string;
};

type LabelRegistryRow = {
  label_id: string;
  name: string;
};

/**
 * Cached HA entity, area and label registries for metadata-aware dashboards.
 */
class RegistryStore {
  private entities = new Map<string, EntityRegistryEntry>();
  private areas = new Map<string, AreaEntry>();
  private labels = new Map<string, LabelEntry>();
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

  getEntityEntry = (entityId: string): EntityRegistryEntry | undefined =>
    this.entities.get(entityId);

  getEntityArea = (entityId: string): string | undefined =>
    this.entities.get(entityId)?.area_id ?? undefined;

  getAreaName = (areaId: string): string | undefined =>
    this.areas.get(areaId)?.name;

  getAreas = (): AreaEntry[] => Array.from(this.areas.values());

  getLabels = (): LabelEntry[] => Array.from(this.labels.values());

  getLabelName = (labelId: string): string | undefined =>
    this.labels.get(labelId)?.name;

  getEntitiesInArea = (areaId: string): string[] => {
    const out: string[] = [];
    for (const [entityId, entry] of this.entities) {
      if (entry.area_id === areaId) out.push(entityId);
    }
    return out;
  };

  getEntitiesWithLabel = (labelId: string): string[] => {
    const out: string[] = [];
    for (const [entityId, entry] of this.entities) {
      if (entry.labels.includes(labelId)) out.push(entityId);
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
      connection.sendMessagePromise<LabelRegistryRow[]>({
        type: 'config/label_registry/list',
      }),
    ])
      .then(([entityRows, areaRows, labelRows]) => {
        this.entities.clear();
        for (const row of entityRows) {
          this.entities.set(row.entity_id, {
            entity_id: row.entity_id,
            name: row.name,
            icon: row.icon,
            area_id: row.area_id,
            labels: row.labels ?? [],
            hidden: row.hidden_by != null,
            disabled: row.disabled_by != null,
          });
        }
        this.areas.clear();
        for (const row of areaRows) {
          this.areas.set(row.area_id, {
            area_id: row.area_id,
            name: row.name,
          });
        }
        this.labels.clear();
        for (const row of labelRows) {
          this.labels.set(row.label_id, {
            label_id: row.label_id,
            name: row.name,
          });
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
