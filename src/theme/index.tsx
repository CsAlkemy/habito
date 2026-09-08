import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { useStore } from '@/data/store';
import { makeText } from './text';
import { DEFAULT_ACCENT, makeTheme, type Scheme, type Theme } from './tokens';

/**
 * The bridge between the persisted appearance settings (theme mode + accent,
 * kept in the store) and everything that draws. Components never import a
 * palette — they read `useTheme()` and build their sheets with `themedStyles`,
 * so flipping the mode or accent restyles the whole app in one render.
 */

function buildTheme(scheme: Scheme, accent: string): Theme {
  const base = makeTheme(scheme, accent);
  return { ...base, text: makeText(base.colors) };
}

const fallback = buildTheme('dark', DEFAULT_ACCENT);

const ThemeContext = createContext<Theme>(fallback);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, accent } = useStore();
  const system = useColorScheme();
  const scheme: Scheme = themeMode === 'system' ? (system === 'light' ? 'light' : 'dark') : themeMode;
  const theme = useMemo(() => buildTheme(scheme, accent), [scheme, accent]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Forces one scheme for a subtree while keeping the chosen accent — the
 * lock-screen preview depicts a phone's lock screen, which stays dark no
 * matter how the app itself is themed.
 */
export function ThemeScope({ scheme, children }: { scheme: Scheme; children: React.ReactNode }) {
  const { accent } = useStore();
  const theme = useMemo(() => buildTheme(scheme, accent), [scheme, accent]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * A themed StyleSheet: `const useStyles = themedStyles((t) => ({...}))`, then
 * `const styles = useStyles()` inside the component. Sheets are created once
 * per theme and cached, so a re-render under an unchanged theme costs a map
 * lookup, exactly like the old module-level `StyleSheet.create`.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  make: (theme: Theme) => T & StyleSheet.NamedStyles<T>,
): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(make(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}

export type { Theme };
