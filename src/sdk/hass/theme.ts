import { useSyncExternalStore } from 'react';
import { hassStore } from './stores/hassStore';
import type { AppHass, HassThemes } from './types';

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
  return hass.themes?.default_theme ?? 'default';
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

function flattenHaTheme(raw: Record<string, unknown>, dark: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'modes') continue;
    if (typeof value === 'string') out[key] = value;
  }

  const modes = raw.modes;
  if (modes && typeof modes === 'object' && !Array.isArray(modes)) {
    const block = dark
      ? (modes as Record<string, unknown>).dark
      : (modes as Record<string, unknown>).light;
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      for (const [key, value] of Object.entries(block as Record<string, unknown>)) {
        if (typeof value === 'string') out[key] = value;
      }
    }
  }

  return out;
}

function themeHasDarkMode(raw: Record<string, unknown> | undefined): boolean {
  if (!raw) return false;
  const modes = raw.modes;
  if (!modes || typeof modes !== 'object' || Array.isArray(modes)) return false;
  const dark = (modes as Record<string, unknown>).dark;
  return Boolean(dark && typeof dark === 'object' && !Array.isArray(dark));
}

function themeNameForMode(hass: AppHass | null, dark: boolean): string {
  const name = activeThemeName(hass);
  if (!dark) return name;

  const catalog = hass?.themes?.themes;
  if (!catalog) return name;

  const current = catalog[name];
  if (themeHasDarkMode(current as Record<string, unknown> | undefined)) {
    return name;
  }

  const defaultDark = hass?.themes?.default_dark_theme;
  if (defaultDark && catalog[defaultDark]) {
    return defaultDark;
  }

  return name;
}

function resolveThemeVars(hass: AppHass | null, dark: boolean): Record<string, string> {
  const catalog = hass?.themes?.themes;
  if (!catalog) return {};

  const themeName = themeNameForMode(hass, dark);
  const raw = catalog[themeName] ?? catalog.default ?? catalog[Object.keys(catalog)[0] ?? ''];
  if (!raw || typeof raw !== 'object') return {};

  return flattenHaTheme(raw as Record<string, unknown>, dark);
}

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value while nothing changed — otherwise React re-renders in an infinite loop.
let cachedTheme: ThemeVars | null = null;
let cachedThemeSig = '';

function readTheme(): ThemeVars {
  const hass = hassStore.getHass();
  const dark = readDarkMode();
  const themeName = themeNameForMode(hass, dark);
  const themeVars = resolveThemeVars(hass, dark);

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

  const sig = `${themeName}\0${dark ? '1' : '0'}\0${JSON.stringify(next)}`;
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

/** Load HA frontend themes for dev preview (websocket). */
export async function fetchHaThemes(
  connection: { sendMessagePromise: (msg: { type: string; [key: string]: unknown }) => Promise<unknown> },
): Promise<HassThemes> {
  const data = (await connection.sendMessagePromise({
    type: 'frontend/get_themes',
  })) as {
    themes: Record<string, Record<string, unknown>>;
    default_theme: string;
    default_dark_theme?: string | null;
  };

  let theme = data.default_theme;
  let darkMode = false;

  try {
    const core = (await connection.sendMessagePromise({
      type: 'frontend/get_user_data',
      key: 'core',
    })) as { value?: { theme?: string; darkMode?: boolean | 'auto' } };
    const prefs = core?.value;
    if (typeof prefs?.theme === 'string') theme = prefs.theme;
    const dm = prefs?.darkMode;
    if (dm === true || dm === false) {
      darkMode = dm;
    } else if (dm === 'auto' && typeof window !== 'undefined') {
      darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch {
    console.log('[Debug fetchHaThemes]: frontend/get_user_data nicht verfügbar');
  }

  console.log('[Debug fetchHaThemes]:', {
    theme,
    darkMode,
    defaultTheme: data.default_theme,
    defaultDarkTheme: data.default_dark_theme,
    themeCount: Object.keys(data.themes ?? {}).length,
  });

  return {
    theme,
    darkMode,
    default_theme: data.default_theme,
    default_dark_theme: data.default_dark_theme ?? undefined,
    themes: data.themes,
  };
}
