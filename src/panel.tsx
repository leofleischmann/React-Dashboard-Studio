import type { Root } from 'react-dom/client';
import { hassStore } from './sdk/hass/store';
import type { AppHass } from './sdk/hass/types';
import { mountStudio } from './mount';

// MUST match PANEL_TAG in custom_components/homeassistant_dashboard_studio/const.py
const TAG = 'homeassistant-dashboard-studio-panel';

/**
 * The custom element Home Assistant instantiates for the panel.
 * HA assigns `hass`, `narrow`, `route` and `panel` as properties; we forward
 * `hass`/`narrow` into our store and let React do the rest.
 *
 * The Studio renders into this element's shadow root (via mountStudio) so its
 * styles are isolated and actually apply — HA hosts custom panels inside its own
 * shadow DOM, where document.head stylesheets do not reach.
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
      this.root = mountStudio(this);
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
