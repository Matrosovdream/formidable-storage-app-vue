<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import * as sitesApi from '@/api/sites';
import { formatNumber } from '@/utils/format';

const router = useRouter();
const sites = ref([]);
const loading = ref(true);
const error = ref('');

const showDeleteModal = ref(false);
const siteToDelete = ref(null);
const deleting = ref(false);
const deleteError = ref('');

const loadSites = async () => {
  loading.value = true;
  error.value = '';
  try {
    sites.value = await sitesApi.list();
  } catch (e) {
    error.value = 'Failed to load sites.';
    sites.value = [];
  } finally {
    loading.value = false;
  }
};

const stats = (site) => ({
  fields: formatNumber(site?.stats?.fields ?? 0),
  emails: formatNumber(site?.stats?.emails ?? 0),
  history: formatNumber(site?.stats?.entry_history ?? 0),
});

const queueStats = (site) => {
  const q = site?.stats?.queue || {};
  return {
    fields: formatNumber(q.fields ?? 0),
    emails: formatNumber(q.emails ?? 0),
    history: formatNumber(q.entry_history ?? 0),
    shipments: formatNumber(q.shipment_history ?? 0),
  };
};

const goView = (site) => router.push({ name: 'dashboard-site-view', params: { site_id: site.id } });
const goAdd = () => router.push({ name: 'dashboard-site-add' });

const askDelete = (site) => {
  siteToDelete.value = site;
  deleteError.value = '';
  showDeleteModal.value = true;
};
const cancelDelete = () => {
  showDeleteModal.value = false;
  siteToDelete.value = null;
};
const confirmDelete = async () => {
  if (!siteToDelete.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await sitesApi.remove(siteToDelete.value.id);
    await loadSites();
    showDeleteModal.value = false;
    siteToDelete.value = null;
  } catch (e) {
    deleteError.value = 'Failed to delete site.';
  } finally {
    deleting.value = false;
  }
};

onMounted(loadSites);
</script>

<template>
  <DashboardLayout title="Sites">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Your sites</h2>
      <button
        type="button"
        class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded"
        @click="goAdd"
      >
        Add site
      </button>
    </div>

    <div v-if="loading" class="text-slate-500">Loading sites…</div>
    <div v-else-if="error" class="text-rose-600">{{ error }}</div>
    <div v-else-if="sites.length === 0" class="text-slate-500 text-sm">No sites yet.</div>

    <ul v-else class="space-y-3">
      <li
        v-for="site in sites"
        :key="site.id"
        class="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-start justify-between gap-4"
      >
        <div class="flex-1 min-w-[14rem]">
          <div class="font-semibold text-slate-900">{{ site.name }}</div>
          <div class="text-sm text-slate-500 break-all">{{ site.url }}</div>
        </div>

        <div class="text-xs text-slate-500 min-w-[16rem]">
          <div class="flex gap-4 flex-wrap">
            <div><div class="font-semibold text-slate-900">{{ stats(site).fields }}</div><div>Fields</div></div>
            <div><div class="font-semibold text-slate-900">{{ stats(site).emails }}</div><div>Emails</div></div>
            <div><div class="font-semibold text-slate-900">{{ stats(site).history }}</div><div>Entry updates</div></div>
          </div>
          <hr class="my-2 border-slate-200" />
          <div class="uppercase tracking-wide text-[10px] mb-1 text-slate-400">In queue</div>
          <div class="flex gap-4 flex-wrap">
            <div><div class="font-semibold text-slate-900">{{ queueStats(site).fields }}</div><div>Fields</div></div>
            <div><div class="font-semibold text-slate-900">{{ queueStats(site).emails }}</div><div>Emails</div></div>
            <div><div class="font-semibold text-slate-900">{{ queueStats(site).history }}</div><div>Entry updates</div></div>
            <div><div class="font-semibold text-slate-900">{{ queueStats(site).shipments }}</div><div>Shipments</div></div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="text-sm px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
            @click="goView(site)"
          >
            View
          </button>
          <button
            type="button"
            class="text-sm px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white"
            @click="askDelete(site)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>

    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-lg shadow-lg max-w-sm w-full p-5">
        <h5 class="text-lg font-semibold mb-2">Are you sure?</h5>
        <p class="text-sm text-slate-700 mb-3">
          You are about to delete <strong>{{ siteToDelete?.name }}</strong>.
        </p>
        <p v-if="deleteError" class="text-sm text-rose-600 mb-3">{{ deleteError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300" :disabled="deleting" @click="cancelDelete">No</button>
          <button type="button" class="px-3 py-1.5 text-sm rounded bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Yes, delete' }}
          </button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
