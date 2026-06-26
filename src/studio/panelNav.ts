import { panelUrlPath } from './workspace';

/**
 * Switch to another workspace dashboard in the HA sidebar.
 * Used after create — panels.py registers the path on save.
 */
export function navigateToProjectPanel(projectId: string): void {
  const path = `/${panelUrlPath(projectId)}`;
  if (window.location.pathname === path) return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event('popstate'));
}
