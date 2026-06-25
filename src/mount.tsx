import { type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Studio from './studio/Studio';
import { RenderRootContext } from './studio/shadowRoot';
import { defaultDashboardCss, sdkPanelCss } from './panel-styles';
import studioCss from './studio/studio.css?inline';

export const DEFAULT_DASHBOARD_STYLE_ID = 'rd-default-dashboard-styles';

function basePanelCss(): string {
  return `:host { display: block; height: 100%; }\n${sdkPanelCss}\n${studioCss}`;
}

/** Toggle example-dashboard CSS in the shadow root (custom projects skip this). */
export function syncDefaultDashboardStyles(shadow: ShadowRoot, enabled: boolean): void {
  const existing = shadow.getElementById(DEFAULT_DASHBOARD_STYLE_ID) as HTMLStyleElement | null;
  if (enabled) {
    if (existing) return;
    const style = document.createElement('style');
    style.id = DEFAULT_DASHBOARD_STYLE_ID;
    style.textContent = defaultDashboardCss;
    shadow.appendChild(style);
    console.log('[Debug mount]: default-dashboard CSS injected');
    return;
  }
  existing?.remove();
  if (existing) {
    console.log('[Debug mount]: default-dashboard CSS removed');
  }
}

/**
 * Render the Studio into `host`'s shadow root, fully style-isolated from HA.
 * Pass a custom `App` in dev (e.g. DevShell with connection banner).
 */
export function mountStudio(host: HTMLElement, App: ComponentType = Studio): Root {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = basePanelCss();
  const container = document.createElement('div');
  shadow.replaceChildren(style, container);

  const root = createRoot(container);
  root.render(
    <RenderRootContext.Provider value={shadow}>
      <App />
    </RenderRootContext.Provider>,
  );
  return root;
}
