<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import * as sitesApi from '@/api/sites';
import { formatNumber, formatDate } from '@/utils/format';

const props = defineProps({
  site_id: { type: [String, Number], required: true },
});

const router = useRouter();
const site = ref(null);
const loading = ref(true);
const error = ref('');
const copied = ref(false);

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    site.value = await sitesApi.view(props.site_id);
  } catch {
    error.value = 'Failed to load site.';
    site.value = null;
  } finally {
    loading.value = false;
  }
};

const back = () => router.push({ name: 'dashboard-sites' });

const copyToken = async () => {
  if (!site.value?.token) return;
  try {
    await navigator.clipboard.writeText(site.value.token);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Ignore.
  }
};

onMounted(load);
</script>

<template>
  <DashboardLayout title="Site details">
    <button type="button" class="text-sm text-indigo-600 hover:underline mb-4" @click="back">← Back to sites</button>

    <div v-if="loading" class="text-slate-500">Loading…</div>
    <div v-else-if="error" class="text-rose-600">{{ error }}</div>
    <div v-else-if="!site" class="text-slate-500">Site not found.</div>

    <div v-else class="space-y-6 max-w-3xl">
      <section class="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
        <div><span class="font-semibold">ID:</span> <span class="ml-2">{{ site.id }}</span></div>
        <div><span class="font-semibold">Name:</span> <span class="ml-2">{{ site.name }}</span></div>
        <div>
          <span class="font-semibold">URL:</span>
          <a :href="site.url" target="_blank" rel="noopener noreferrer" class="ml-2 text-indigo-600 hover:underline break-all">
            {{ site.url }}
          </a>
        </div>
        <div v-if="site.created_at" class="text-sm text-slate-500">
          Created {{ formatDate(site.created_at) }}
        </div>
      </section>

      <section v-if="site.token" class="bg-white border border-slate-200 rounded-lg p-5">
        <h3 class="font-semibold mb-2">REST token</h3>
        <div class="bg-slate-100 border border-slate-200 rounded px-3 py-2 font-mono text-xs break-all mb-3">
          {{ site.token }}
        </div>
        <button type="button" class="text-sm px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="copyToken">
          {{ copied ? 'Copied!' : 'Copy token' }}
        </button>
      </section>

      <section v-if="site.stats" class="bg-white border border-slate-200 rounded-lg p-5">
        <h3 class="font-semibold mb-3">Stats</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><div class="text-2xl font-semibold">{{ formatNumber(site.stats.fields) }}</div><div class="text-slate-500">Fields</div></div>
          <div><div class="text-2xl font-semibold">{{ formatNumber(site.stats.emails) }}</div><div class="text-slate-500">Emails</div></div>
          <div><div class="text-2xl font-semibold">{{ formatNumber(site.stats.entry_history) }}</div><div class="text-slate-500">Entry updates</div></div>
        </div>

        <div v-if="site.stats.queue" class="mt-5">
          <h4 class="uppercase tracking-wide text-xs text-slate-400 mb-2">In queue</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><div class="text-lg font-semibold">{{ formatNumber(site.stats.queue.fields) }}</div><div class="text-slate-500">Fields</div></div>
            <div><div class="text-lg font-semibold">{{ formatNumber(site.stats.queue.emails) }}</div><div class="text-slate-500">Emails</div></div>
            <div><div class="text-lg font-semibold">{{ formatNumber(site.stats.queue.entry_history) }}</div><div class="text-slate-500">Entry updates</div></div>
            <div><div class="text-lg font-semibold">{{ formatNumber(site.stats.queue.shipment_history) }}</div><div class="text-slate-500">Shipments</div></div>
          </div>
        </div>
      </section>
    </div>
  </DashboardLayout>
</template>
