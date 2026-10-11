import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
