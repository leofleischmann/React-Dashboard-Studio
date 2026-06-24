import { createRoot, type Root } from 'react-dom/client';
import { hassStore } from './hass/store';
import type { AppHass } from './hass/types';
import Studio from './studio/Studio';

// MUST match PANEL_TAG in custom_components/react_dashboard_studio/const.py
const TAG = 'react-dashboard-studio-panel';

/**
 * The custom element Home Assistant instantiates for the panel.
 * HA assigns `hass`, `narrow`, `route` and `panel` as properties; we forward
 * `hass` into our store and let React do the rest.
 */
export class ReactDashboardStudioPanel extends HTMLElement {
  private root?: Root;

  set hass(hass: AppHass) {
    hassStore.setHass(hass);
  }

  // HA toggles this when the layout is narrow (mobile / collapsed sidebar).
  set narrow(v: boolean) {
    hassStore.setNarrow(!!v);
  }

  // HA also assigns these; accepted and currently ignored.
  set route(_v: unknown) {}
  set panel(_v: unknown) {}

  connectedCallback(): void {
    if (!this.root) {
      this.root = createRoot(this);
      this.root.render(<Studio />);
    }
  }

  disconnectedCallback(): void {
    const root = this.root;
    this.root = undefined;
    // Defer to avoid "unmount while rendering" warnings during HA navigation.
    if (root) queueMicrotask(() => root.unmount());
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, ReactDashboardStudioPanel);
}
