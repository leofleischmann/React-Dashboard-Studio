import type { Project } from '../studio/project';

/** Class prefixes used only by default-dashboard/ — if absent, skip demo CSS in shadow root. */
const DEFAULT_DASHBOARD_STYLE_MARKERS = [
  'rd-dd',
  'rd-dd-hook',
  'rd-hero',
  'rd-kpi',
  'rd-panel',
  'rd-pagehead',
  'rd-reveal',
  'rd-scenes',
  'rd-miniapp',
  'rd-glass',
  'rd-rise',
  'rd-ring',
  'rd-energy',
  'rd-presence',
  'rd-secure',
  'rd-agenda',
  'rd-batteries',
  'rd-chart-panel',
  'rd-fmt-',
  'rd-aggbar',
] as const;

export function projectUsesDefaultDashboardStyles(project: Project): boolean {
  const blob = Object.values(project.files).join('\n');
  return DEFAULT_DASHBOARD_STYLE_MARKERS.some((marker) => blob.includes(marker));
}
