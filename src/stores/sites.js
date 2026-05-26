import { defineStore } from 'pinia';
import * as sitesApi from '@/api/sites';

export const useSitesStore = defineStore('sites', {
  state: () => ({
    items: [],
    loaded: false,
    loading: false,
  }),
  actions: {
    async ensureLoaded() {
      if (this.loaded || this.loading) return this.items;
      return this.refresh();
    },
    async refresh() {
      this.loading = true;
      try {
        this.items = await sitesApi.list();
        this.loaded = true;
      } catch {
        this.items = [];
      } finally {
        this.loading = false;
      }
      return this.items;
    },
    invalidate() {
      this.loaded = false;
    },
  },
});
