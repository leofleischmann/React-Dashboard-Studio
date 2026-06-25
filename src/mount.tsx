import { type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Studio from './studio/Studio';
import { RenderRootContext } from './studio/shadowRoot';
import { panelCss } from './panel-styles';
import studioCss from './studio/studio.css?inline';

const CSS = `:host { display: block; height: 100%; }\n${panelCss}\n${studioCss}`;

/**
 * Render the Studio into `host`'s shadow root, fully style-isolated from HA.
 * Pass a custom `App` in dev (e.g. DevShell with connection banner).
 */
export function mountStudio(host: HTMLElement, App: ComponentType = Studio): Root {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CSS;
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
