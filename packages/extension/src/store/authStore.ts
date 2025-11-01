import { create } from 'zustand';
import { authService } from '../services/auth.service';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,

  login: async () => {
    set({ loading: true, error: null });
    try {
      const authState = await authService.login();
      set({
        isAuthenticated: true,
        user: authState.user,
        token: authState.token,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({ loading: false, error: errorMessage });
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null,
    });
  },

  checkAuth: async () => {
    const authState = await authService.getAuthState();
    if (authState.token && authState.user) {
      try {
        const user = await authService.verifyToken(authState.token);
        set({
          isAuthenticated: true,
          user,
          token: authState.token,
        });
      } catch {
        await authService.clearAuthState();
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        });
      }
    }
  },

  setAuth: (user, token) => {
    set({
      isAuthenticated: true,
      user,
      token,
    });
  },

  clearAuth: () => {
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },
}));
