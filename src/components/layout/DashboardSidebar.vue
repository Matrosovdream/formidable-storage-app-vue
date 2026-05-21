<script setup>
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const isActive = (names) => {
  const set = Array.isArray(names) ? names : [names];
  return set.includes(route.name);
};

const go = (name) => router.push({ name });

const items = [
  { label: 'Dashboard', name: 'dashboard', match: ['dashboard'] },
  { label: 'Sites', name: 'dashboard-sites', match: ['dashboard-sites', 'dashboard-site-view', 'dashboard-site-add'] },
  { label: 'Data', name: 'dashboard-data', match: ['dashboard-data', 'dashboard-data-entry'] },
];
</script>

<template>
  <nav class="py-4 px-2 flex flex-col gap-1">
    <button
      v-for="item in items"
      :key="item.name"
      type="button"
      class="text-left px-3 py-2 rounded text-sm font-medium transition"
      :class="isActive(item.match)
        ? 'bg-indigo-600 text-white'
        : 'text-slate-700 hover:bg-slate-200'"
      @click="go(item.name)"
    >
      {{ item.label }}
    </button>
  </nav>
</template>
