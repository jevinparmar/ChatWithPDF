import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, error, login, signup, logout, checkAuth } =
    useAuthStore();

  const isAdmin = user?.role === 'admin';

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    isAdmin,
    login,
    signup,
    logout,
    checkAuth,
  };
}
