import type { ThemePreference } from '../types/orm';

export const THEME_STORAGE_KEY = 'orm407_theme_preference';

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'dark' ? 'dark' : 'light';
}

export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

export function getNextThemePreference(current: ThemePreference): ThemePreference {
  return current === 'dark' ? 'light' : 'dark';
}

export function loadCachedThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return normalizeThemePreference(raw);
  } catch {
    return 'light';
  }
}

export function saveCachedThemePreference(theme: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemePreference(theme));
  } catch {
    // Ignore storage quota or private-browsing exceptions
  }
}

export function applyThemeToDocument(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const normalized = normalizeThemePreference(theme);
  root.classList.toggle('dark', normalized === 'dark');
  root.dataset.theme = normalized;
}
