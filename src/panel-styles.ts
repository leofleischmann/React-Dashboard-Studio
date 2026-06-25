/**
 * Panel CSS for the shadow root (mount.tsx).
 *
 * SDK (all dashboards): tokens, primitives, widgets, sdk/ui CSS (Vite glob).
 * Default-dashboard example: home.css + demo-pages.css (injected only when needed).
 *
 * Studio editor chrome: studio.css (separate import in mount.tsx).
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

/** @ha/ui + layout primitives — always loaded */
export const sdkPanelCss = [tokens, primitives, widgets, sdkUiCss].join('\n');

/** Shipped example dashboard only — loaded when project references these classes */
export const defaultDashboardCss = [defaultHome, defaultDemoPages].join('\n');
