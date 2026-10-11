import { create } from 'zustand';

function applyTheme(theme) {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const savedTheme = localStorage.getItem('theme') || 'system';
applyTheme(savedTheme);

// Listen to OS theme changes if on system
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('theme') || 'system';
    if (current === 'system') {
      applyTheme('system');
    }
  });
}

export const useThemeStore = create((set, get) => ({
  theme: savedTheme, // 'light' | 'dark' | 'system'

  setTheme: (newTheme) => {
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    set({ theme: newTheme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
    set({ theme: next });
  },
}));
