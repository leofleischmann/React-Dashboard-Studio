type Listener = () => void;

/**
 * Panel config from Home Assistant (`panel.config.project_id`).
 * Set on the custom element before React mounts.
 */
class PanelStore {
  private projectId: string | null = null;
  private listeners = new Set<Listener>();

  setProjectId(id: string | null): void {
    const next = id?.trim() || null;
    if (this.projectId === next) return;
    this.projectId = next;
    for (const listener of this.listeners) listener();
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const panelStore = new PanelStore();
