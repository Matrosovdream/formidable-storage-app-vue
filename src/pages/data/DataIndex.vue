<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { useSitesStore } from '@/stores/sites';

const router = useRouter();
const sitesStore = useSitesStore();

onMounted(async () => {
  await sitesStore.ensureLoaded();
  if (sitesStore.items.length > 0) {
    router.replace({ name: 'dashboard-data-site', params: { site_id: sitesStore.items[0].id } });
  }
});
</script>

<template>
  <DashboardLayout title="Data">
    <div v-if="sitesStore.loading" class="text-slate-500">Loading sites…</div>
    <div v-else-if="sitesStore.items.length === 0" class="max-w-md text-slate-600">
      <p class="mb-3">You don't have any sites yet.</p>
      <router-link
        :to="{ name: 'dashboard-site-add' }"
        class="inline-block px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        Add a site
      </router-link>
    </div>
    <div v-else class="text-slate-500 text-sm">Select a site from the sidebar.</div>
  </DashboardLayout>
</template>
