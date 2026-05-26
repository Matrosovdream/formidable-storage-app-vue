<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSitesStore } from '@/stores/sites';

const route = useRoute();
const router = useRouter();
const sitesStore = useSitesStore();

const dataRoutes = ['dashboard-data', 'dashboard-data-site', 'dashboard-data-entry'];

const isActive = (names) => {
  const set = Array.isArray(names) ? names : [names];
  return set.includes(route.name);
};

const isDataRoute = computed(() => dataRoutes.includes(route.name));
const dataExpanded = ref(isDataRoute.value);

watch(isDataRoute, (v) => {
  if (v) dataExpanded.value = true;
});

const currentSiteId = computed(() => {
  if (!isDataRoute.value) return null;
  const raw = route.params.site_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
});

const goSite = (siteId) => router.push({ name: 'dashboard-data-site', params: { site_id: siteId } });
const goData = () => router.push({ name: 'dashboard-data' });
const go = (name) => router.push({ name });

const toggleData = () => {
  dataExpanded.value = !dataExpanded.value;
  if (!isDataRoute.value && dataExpanded.value) {
    // first expand also navigates to the data index
    goData();
  }
};

onMounted(() => {
  sitesStore.ensureLoaded();
});
</script>

<template>
  <nav class="py-4 px-2 flex flex-col gap-1">
    <button
      type="button"
      class="text-left px-3 py-2 rounded text-sm font-medium transition"
      :class="isActive(['dashboard'])
        ? 'bg-indigo-600 text-white'
        : 'text-slate-700 hover:bg-slate-200'"
      @click="go('dashboard')"
    >
      Dashboard
    </button>

    <button
      type="button"
      class="text-left px-3 py-2 rounded text-sm font-medium transition"
      :class="isActive(['dashboard-sites', 'dashboard-site-view', 'dashboard-site-add'])
        ? 'bg-indigo-600 text-white'
        : 'text-slate-700 hover:bg-slate-200'"
      @click="go('dashboard-sites')"
    >
      Sites
    </button>

    <div>
      <button
        type="button"
        class="w-full text-left px-3 py-2 rounded text-sm font-medium transition flex items-center justify-between"
        :class="isDataRoute && !currentSiteId
          ? 'bg-indigo-600 text-white'
          : 'text-slate-700 hover:bg-slate-200'"
        @click="toggleData"
      >
        <span>Data</span>
        <span class="text-xs opacity-60">{{ dataExpanded ? '▾' : '▸' }}</span>
      </button>

      <div v-if="dataExpanded" class="pl-4 mt-1 flex flex-col gap-0.5">
        <div v-if="sitesStore.loading && sitesStore.items.length === 0" class="px-3 py-1.5 text-xs text-slate-400">
          Loading sites…
        </div>
        <div v-else-if="sitesStore.items.length === 0" class="px-3 py-1.5 text-xs text-slate-400">
          No sites
        </div>
        <button
          v-for="site in sitesStore.items"
          :key="site.id"
          type="button"
          :title="site.name"
          class="text-left px-3 py-1.5 rounded text-sm truncate transition"
          :class="currentSiteId === site.id
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100'"
          @click="goSite(site.id)"
        >
          {{ site.name }}
        </button>
      </div>
    </div>
  </nav>
</template>
