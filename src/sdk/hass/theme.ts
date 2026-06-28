import { useSyncExternalStore } from 'react';
import { hassStore } from './stores/hassStore';
import type { AppHass } from './types';

export type ThemeVars = Record<string, string> & {
  primary: string;
  accent: string;
};

function activeThemeName(hass: AppHass | null): string {
  if (!hass) return 'default';
  if (typeof hass.themes?.theme === 'string') return hass.themes.theme;
  const selected = hass.selectedTheme;
  if (selected && typeof selected === 'object' && typeof selected.theme === 'string') {
    return selected.theme;
  }
  if (typeof selected === 'string') return selected;
  return 'default';
}

/** Effective dark mode — HA stores this on `hass.themes.darkMode`, not `hass.darkMode`. */
export function readDarkMode(): boolean {
  const previewOverride = hassStore.getPreviewDarkModeOverride();
  if (previewOverride !== null) return previewOverride;

  const hass = hassStore.getHass();
  if (typeof hass?.themes?.darkMode === 'boolean') return hass.themes.darkMode;
  if (typeof hass?.darkMode === 'boolean') return hass.darkMode;

  const theme = activeThemeName(hass);
  return theme.includes('dark') || theme === 'midnight' || theme === 'ios-dark';
}

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value while nothing changed — otherwise React re-renders in an infinite loop.
// We cache the computed object and only hand out a new reference when the
// effective theme actually changes.
let cachedTheme: ThemeVars | null = null;
let cachedThemeSig = '';

function readTheme(): ThemeVars {
  const hass = hassStore.getHass();
  const themeName = activeThemeName(hass);
  const themeVars = hass?.themes?.themes?.[themeName] ?? {};

  const primary =
    themeVars['primary-color'] ??
    (typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--primary-color') ||
        '#03a9f4'
      : '#03a9f4');

  const accent =
    (themeVars['accent-color'] ?? themeVars['primary-color'] ?? primary.trim()) ||
    '#03a9f4';

  const next: ThemeVars = {
    ...themeVars,
    primary: primary.trim() || '#03a9f4',
    accent: accent.trim() || primary.trim() || '#03a9f4',
  };

  const sig = `${themeName}\0${JSON.stringify(next)}`;
  if (sig === cachedThemeSig && cachedTheme) return cachedTheme;
  cachedThemeSig = sig;
  cachedTheme = next;
  return next;
}

/** Home Assistant theme colors as CSS-ready values. */
export function useTheme(): ThemeVars {
  return useSyncExternalStore(hassStore.subscribeHassMeta, readTheme, readTheme);
}

/** Whether HA frontend is in dark mode. */
export function useDarkMode(): boolean {
  return useSyncExternalStore(hassStore.subscribeHassMeta, readDarkMode, () => false);
}

/** Inject HA theme CSS variables onto a container element. */
export function applyThemeVars(
  element: HTMLElement,
  theme: ThemeVars,
): () => void {
  const prev = new Map<string, string>();
  for (const [key, value] of Object.entries(theme)) {
    if (key === 'primary' || key === 'accent') continue;
    const cssVar = key.startsWith('--') ? key : `--${key}`;
    prev.set(cssVar, element.style.getPropertyValue(cssVar));
    element.style.setProperty(cssVar, value);
  }
  prev.set('--rd-accent', element.style.getPropertyValue('--rd-accent'));
  prev.set('--primary-color', element.style.getPropertyValue('--primary-color'));
  element.style.setProperty('--rd-accent', theme.accent);
  element.style.setProperty('--primary-color', theme.primary);

  return () => {
    for (const [cssVar, value] of prev) {
      if (value) element.style.setProperty(cssVar, value);
      else element.style.removeProperty(cssVar);
    }
  };
}
