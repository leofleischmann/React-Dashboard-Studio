import { useSyncExternalStore } from 'react';
import { hassStore } from './store';

export type ThemeVars = Record<string, string> & {
  primary: string;
  accent: string;
};

function readTheme(): ThemeVars {
  const hass = hassStore.getHass();
  const themeName = (hass?.selectedTheme as string | undefined) ?? 'default';
  const themes = hass?.themes as
    | Record<string, Record<string, string>>
    | undefined;
  const vars = themes?.[themeName] ?? {};

  const primary =
    vars['primary-color'] ??
    (typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(
          '--primary-color',
        ) || '#03a9f4'
      : '#03a9f4');

  const accent =
    (vars['accent-color'] ?? vars['primary-color'] ?? primary.trim()) ||
    '#03a9f4';

  return {
    ...vars,
    primary: primary.trim() || '#03a9f4',
    accent: accent.trim() || primary.trim() || '#03a9f4',
  };
}

/** Home Assistant theme colors as CSS-ready values. */
export function useTheme(): ThemeVars {
  return useSyncExternalStore(hassStore.subscribe, readTheme, readTheme);
}

/** Whether HA frontend is in dark mode. */
export function useDarkMode(): boolean {
  return useSyncExternalStore(
    hassStore.subscribe,
    () => {
      const hass = hassStore.getHass();
      if (typeof hass?.darkMode === 'boolean') return hass.darkMode;
      const theme = hass?.selectedTheme as string | undefined;
      if (!theme) return false;
      return theme.includes('dark') || theme === 'midnight' || theme === 'ios-dark';
    },
    () => false,
  );
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
