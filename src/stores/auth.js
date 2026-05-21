import { defineStore } from 'pinia';
import { http, TOKEN_STORAGE_KEY, setUnauthorizedHandler } from '@/api/http';
import * as authApi from '@/api/auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (s) => Boolean(s.token),
  },
  actions: {
    hydrate() {
      this.token = localStorage.getItem(TOKEN_STORAGE_KEY);
      setUnauthorizedHandler(() => this.clear());
    },

    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    },

    clear() {
      this.user = null;
      this.setToken(null);
    },

    async login(credentials) {
      const { user, token } = await authApi.login(credentials);
      this.setToken(token);
      this.user = user;
      return user;
    },

    async register(payload) {
      const { user, token } = await authApi.register(payload);
      this.setToken(token);
      this.user = user;
      return user;
    },

    async fetchUser() {
      try {
        const user = await authApi.me();
        this.user = user;
        this.initialized = true;
        if (!user) this.setToken(null);
        return user;
      } catch (e) {
        this.user = null;
        this.initialized = true;
        return null;
      }
    },

    async logout() {
      try {
        if (this.token) await authApi.logout();
      } catch (e) {
        // Ignore — local state cleared regardless.
      } finally {
        this.clear();
      }
    },
  },
});
