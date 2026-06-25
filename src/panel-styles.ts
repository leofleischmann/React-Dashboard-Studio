/**
 * Panel CSS bundle for the shadow root (mount.tsx).
 *
 * SDK (for all dashboards):
 *   - tokens, primitives, widgets, co-located sdk/ui CSS (auto via Vite glob)
 *
 * Default-dashboard example only (not required for custom projects):
 *   - default-dashboard/home.css, default-dashboard/demo-pages.css
 *
 * Studio editor chrome lives in studio.css (imported separately in mount.tsx).
 */

import tokens from './styles/tokens.css?inline';
import primitives from './styles/primitives.css?inline';
import widgets from './styles/widgets.css?inline';
import defaultHome from '../default-dashboard/home.css?inline';
import defaultDemoPages from '../default-dashboard/demo-pages.css?inline';

const sdkUiCssModules = import.meta.glob('./sdk/ui/**/*.css', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Record<string, string>;

const sdkUiCss = Object.keys(sdkUiCssModules)
  .sort((a, b) => a.localeCompare(b))
  .map((key) => sdkUiCssModules[key])
  .join('\n');

/** SDK layers first, then shipped example-dashboard styles */
export const panelCss = [
  tokens,
  primitives,
  widgets,
  sdkUiCss,
  defaultHome,
  defaultDemoPages,
].join('\n');
