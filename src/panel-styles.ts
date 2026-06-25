/**
 * Panel CSS bundle for the shadow root (mount.tsx).
 *
 * Adding styles:
 *   - New featured widget → `sdk/ui/featured/MyWidget.css` (auto-included)
 *   - New domain card   → `sdk/ui/cards/.../MyCard.css` (auto-included)
 *   - Layout / charts   → `sdk/ui/layout.css`, `sdk/ui/charts.css` (auto-included)
 *   - Tokens / showcase → edit files in `styles/` (fixed order below)
 *
 * No manual registry — all .css under sdk/ui/ is auto-discovered (Vite glob).
 */

import tokens from './styles/tokens.css?inline';
import primitives from './styles/primitives.css?inline';
import showcase from './styles/showcase.css?inline';
import widgets from './styles/widgets.css?inline';
import studioShell from './styles/studio-shell.css?inline';

const sdkUiCssModules = import.meta.glob('./sdk/ui/**/*.css', {
  eager: true,
  query: '?inline',
  import: 'default',
}) as Record<string, string>;

const sdkUiCss = Object.keys(sdkUiCssModules)
  .sort((a, b) => a.localeCompare(b))
  .map((key) => sdkUiCssModules[key])
  .join('\n');

/** Layered CSS: tokens → shared → legacy widgets → co-located sdk/ui → studio chrome */
export const panelCss = [tokens, primitives, showcase, widgets, sdkUiCss, studioShell].join(
  '\n',
);
