<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import * as sitesApi from '@/api/sites';
import * as dataApi from '@/api/data';
import { formatDate } from '@/utils/format';

const router = useRouter();

const sites = ref([]);
const sitesLoading = ref(true);
const activeSiteId = ref(null);

const items = ref([]);
const entriesLoading = ref(false);
const pagination = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 });

const entryIdFilter = ref('');
const sortBy = ref('entry_id');
const sortDir = ref('desc');
const page = ref(1);

const loadSites = async () => {
  sitesLoading.value = true;
  try {
    sites.value = await sitesApi.list();
    if (sites.value.length && !activeSiteId.value) {
      activeSiteId.value = sites.value[0].id;
    }
  } catch {
    sites.value = [];
  } finally {
    sitesLoading.value = false;
  }
};

const loadEntries = async () => {
  if (!activeSiteId.value) {
    items.value = [];
    return;
  }
  entriesLoading.value = true;
  try {
    const result = await dataApi.entries(activeSiteId.value, {
      entry_id: entryIdFilter.value || undefined,
      sort_by: sortBy.value,
      sort_dir: sortDir.value,
      page: page.value,
      per_page: pagination.value.per_page,
    });
    items.value = result.items;
    pagination.value = result.pagination;
  } catch {
    items.value = [];
  } finally {
    entriesLoading.value = false;
  }
};

const selectSite = (id) => {
  if (activeSiteId.value === id) return;
  activeSiteId.value = id;
  page.value = 1;
};

const applyFilter = () => { page.value = 1; loadEntries(); };
const clearFilter = () => { entryIdFilter.value = ''; page.value = 1; loadEntries(); };

const changeSort = (field) => {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortDir.value = 'desc';
  }
  page.value = 1;
  loadEntries();
};

const sortIndicator = (field) => {
  if (sortBy.value !== field) return '';
  return sortDir.value === 'asc' ? ' ▲' : ' ▼';
};

const goDetails = (row) => {
  router.push({
    name: 'dashboard-data-entry',
    params: { site_id: activeSiteId.value, entry_id: row.entry_id },
  });
};

const goPage = (p) => {
  if (p < 1 || p > pagination.value.last_page) return;
  page.value = p;
  loadEntries();
};

const pages = computed(() => {
  const last = pagination.value.last_page || 1;
  return Array.from({ length: last }, (_, i) => i + 1);
});

const GENERATORS = {
  emails: {
    key: 'emails',
    label: 'Emails',
    fn: sitesApi.generateEmails,
    fields: [
      { name: 'amount', label: 'Amount', min: 1, max: 10000, default: 10 },
      { name: 'length', label: 'Length (chars)', min: 1, max: 100000, default: 200 },
    ],
  },
  fields: {
    key: 'fields',
    label: 'Fields',
    fn: sitesApi.generateFields,
    fields: [
      { name: 'amount', label: 'Amount', min: 1, max: 10000, default: 10 },
    ],
  },
  entry_updates: {
    key: 'entry_updates',
    label: 'Entry updates',
    fn: sitesApi.generateEntryUpdates,
    fields: [
      { name: 'amount', label: 'Amount', min: 1, max: 10000, default: 10 },
    ],
  },
};

const showGenerateModal = ref(false);
const generator = ref(null);
const generateParams = ref({});
const generating = ref(false);
const generateError = ref('');
const generateResult = ref(null);

const openGenerate = (kind) => {
  const g = GENERATORS[kind];
  if (!g || !activeSiteId.value) return;
  generator.value = g;
  generateParams.value = Object.fromEntries(g.fields.map((f) => [f.name, f.default]));
  generateResult.value = null;
  generateError.value = '';
  showGenerateModal.value = true;
};

const closeGenerate = () => {
  if (generating.value) return;
  showGenerateModal.value = false;
  generator.value = null;
  generateResult.value = null;
  generateError.value = '';
};

const submitGenerate = async () => {
  if (!generator.value || !activeSiteId.value) return;
  generating.value = true;
  generateError.value = '';
  generateResult.value = null;
  try {
    const payload = {};
    for (const f of generator.value.fields) {
      const raw = generateParams.value[f.name];
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        throw new Error(`${f.label} must be a number`);
      }
      if (num < f.min || num > f.max) {
        throw new Error(`${f.label} must be between ${f.min} and ${f.max}`);
      }
      payload[f.name] = num;
    }
    generateResult.value = await generator.value.fn(activeSiteId.value, payload);
    loadEntries();
  } catch (e) {
    generateError.value = e?.response?.data?.message || e?.message || 'Generation failed';
  } finally {
    generating.value = false;
  }
};

const formatMs = (v) => (typeof v === 'number' ? `${v.toFixed(2)} ms` : '—');

watch(activeSiteId, () => loadEntries());

onMounted(async () => {
  await loadSites();
  await loadEntries();
});
</script>

<template>
  <DashboardLayout title="Data">
    <div v-if="sitesLoading" class="text-slate-500">Loading sites…</div>

    <div v-else-if="sites.length === 0" class="text-slate-500 text-sm">No sites available.</div>

    <div v-else>
      <div class="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
        <button
          v-for="site in sites"
          :key="site.id"
          type="button"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap"
          :class="activeSiteId === site.id
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="selectSite(site.id)"
        >
          {{ site.name }}
        </button>
      </div>

      <div class="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Filter by entry ID</label>
          <input
            v-model="entryIdFilter"
            type="number"
            placeholder="Entry ID"
            class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keyup.enter="applyFilter"
          />
        </div>
        <button class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="applyFilter">Apply</button>
        <button class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300" @click="clearFilter">Clear</button>
        <div class="ml-auto text-xs text-slate-500">Total: {{ pagination.total }}</div>
      </div>

      <div class="flex flex-wrap items-center gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-2">Actions</div>
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white"
          :disabled="!activeSiteId"
          @click="openGenerate('emails')"
        >
          Generate emails
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white"
          :disabled="!activeSiteId"
          @click="openGenerate('fields')"
        >
          Generate fields
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white"
          :disabled="!activeSiteId"
          @click="openGenerate('entry_updates')"
        >
          Generate entry updates
        </button>
      </div>

      <div v-if="entriesLoading" class="text-slate-500">Loading entries…</div>
      <div v-else-if="items.length === 0" class="text-slate-500 text-sm">No entries found.</div>

      <div v-else class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('entry_id')">
                ID<span>{{ sortIndicator('entry_id') }}</span>
              </th>
              <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('email_count')">
                Emails<span>{{ sortIndicator('email_count') }}</span>
              </th>
              <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('update_count')">
                Updates<span>{{ sortIndicator('update_count') }}</span>
              </th>
              <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('last_update')">
                Last update<span>{{ sortIndicator('last_update') }}</span>
              </th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="e in items" :key="e.entry_id" class="hover:bg-slate-50">
              <td class="px-3 py-2 font-semibold">{{ e.entry_id }}</td>
              <td class="px-3 py-2">{{ e.email_count }}</td>
              <td class="px-3 py-2">{{ e.update_count }}</td>
              <td class="px-3 py-2 text-slate-500">{{ formatDate(e.last_update) }}</td>
              <td class="px-3 py-2 text-right">
                <button class="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="goDetails(e)">
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="pagination.last_page > 1" class="mt-3 flex gap-1 flex-wrap">
        <button
          class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
          :disabled="pagination.current_page <= 1"
          @click="goPage(pagination.current_page - 1)"
        >
          Prev
        </button>
        <button
          v-for="p in pages"
          :key="p"
          class="px-2.5 py-1 text-xs rounded border"
          :class="p === pagination.current_page
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-slate-200 hover:bg-slate-100'"
          @click="goPage(p)"
        >
          {{ p }}
        </button>
        <button
          class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
          :disabled="pagination.current_page >= pagination.last_page"
          @click="goPage(pagination.current_page + 1)"
        >
          Next
        </button>
      </nav>
    </div>

    <div v-if="showGenerateModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-5">
        <div class="flex items-start justify-between mb-3">
          <h5 class="text-lg font-semibold">Generate {{ generator?.label?.toLowerCase() }}</h5>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 text-xl leading-none"
            :disabled="generating"
            @click="closeGenerate"
          >&times;</button>
        </div>

        <form v-if="!generateResult" class="space-y-3" @submit.prevent="submitGenerate">
          <div v-for="f in generator?.fields || []" :key="f.name">
            <label class="block text-xs font-medium text-slate-500 mb-1">
              {{ f.label }} <span class="text-slate-400">({{ f.min }}–{{ f.max }})</span>
            </label>
            <input
              v-model.number="generateParams[f.name]"
              type="number"
              :min="f.min"
              :max="f.max"
              class="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <p v-if="generateError" class="text-sm text-rose-600">{{ generateError }}</p>

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300"
              :disabled="generating"
              @click="closeGenerate"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
              :disabled="generating"
            >
              {{ generating ? 'Generating…' : 'Generate' }}
            </button>
          </div>
        </form>

        <div v-else class="space-y-3">
          <div class="rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-3 py-2">
            Generated <strong>{{ generateResult.count }}</strong> {{ generateResult.kind }} row(s) for site #{{ generateResult.site_id }}.
          </div>

          <div class="text-xs text-slate-600">
            <div class="font-semibold uppercase tracking-wide text-slate-500 mb-1">Timings</div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <div class="text-slate-400">Generation</div>
                <div class="font-semibold text-slate-900">{{ formatMs(generateResult.timings?.generation_ms) }}</div>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <div class="text-slate-400">Insertion</div>
                <div class="font-semibold text-slate-900">{{ formatMs(generateResult.timings?.insertion_ms) }}</div>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                <div class="text-slate-400">Total</div>
                <div class="font-semibold text-slate-900">{{ formatMs(generateResult.timings?.total_ms) }}</div>
              </div>
            </div>
            <div v-if="generateResult.length != null" class="mt-2 text-slate-500">
              Length per email: <span class="font-semibold text-slate-700">{{ generateResult.length }}</span>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white"
              @click="closeGenerate"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
