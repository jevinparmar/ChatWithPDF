import { create } from 'zustand';
import { authApi } from '../api';

const savedToken = localStorage.getItem('token');
let savedUser = null;
try {
  const userStr = localStorage.getItem('user');
  if (userStr) savedUser = JSON.parse(userStr);
} catch (e) {
  // Ignore parse error
}

export const useAuthStore = create((set, get) => ({
  user: savedUser,
  token: savedToken,
  isAuthenticated: !!savedToken,
  isLoading: false,
  error: null,

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  signup: async ({ email, password, name }) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.signup({ email, password, name });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Signup failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    if (!localStorage.getItem('token')) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      const me = await authApi.getMe();
      localStorage.setItem('user', JSON.stringify(me));
      set({ user: me, isAuthenticated: true });
    } catch (err) {
      get().logout();
    }
  },

  updateUserMode: async (mode) => {
    try {
      const updated = await authApi.updateMode(mode);
      localStorage.setItem('user', JSON.stringify(updated));
      set({ user: updated });
      return updated;
    } catch (err) {
      console.error('Failed to update user mode:', err);
      throw err;
    }
  },
}));
