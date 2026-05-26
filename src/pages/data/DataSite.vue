<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import * as sitesApi from '@/api/sites';
import * as dataApi from '@/api/data';
import { formatNumber, formatDate } from '@/utils/format';

const props = defineProps({
  site_id: { type: [String, Number], required: true },
});

const route = useRoute();
const router = useRouter();

const VALID_TABS = ['entries', 'emails', 'updates'];

const site = ref(null);
const siteLoading = ref(false);
const siteError = ref('');

const activeTab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'entries');

const setTab = (t) => {
  if (!VALID_TABS.includes(t) || activeTab.value === t) return;
  activeTab.value = t;
  router.replace({ query: { ...route.query, tab: t } });
};

const PER_PAGE = 25;

const tabState = ref({
  entries: {
    loaded: false,
    loading: false,
    items: [],
    pagination: { current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0 },
    page: 1,
    sortBy: 'entry_id',
    sortDir: 'desc',
    filters: { entry_id: '' },
  },
  emails: {
    loaded: false,
    loading: false,
    error: '',
    items: [],
    pagination: { current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0 },
    page: 1,
    sortBy: 'date_sent',
    sortDir: 'desc',
    filters: { entry_id: '', subject: '', status: '', email_from: '', email_to: '' },
  },
  updates: {
    loaded: false,
    loading: false,
    error: '',
    items: [],
    pagination: { current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0 },
    page: 1,
    sortBy: 'change_date',
    sortDir: 'desc',
    filters: { entry_id: '', field_id: '' },
  },
});

function pickFilters(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v == null) continue;
    out[k] = v;
  }
  return out;
}

const loadSite = async () => {
  siteLoading.value = true;
  siteError.value = '';
  try {
    site.value = await sitesApi.view(props.site_id);
  } catch {
    site.value = null;
    siteError.value = 'Failed to load site.';
  } finally {
    siteLoading.value = false;
  }
};

const loadEntries = async () => {
  const s = tabState.value.entries;
  s.loading = true;
  try {
    const r = await dataApi.entries(props.site_id, {
      entry_id: s.filters.entry_id || undefined,
      sort_by: s.sortBy,
      sort_dir: s.sortDir,
      page: s.page,
      per_page: PER_PAGE,
    });
    s.items = r.items;
    s.pagination = r.pagination;
    s.loaded = true;
  } catch {
    s.items = [];
  } finally {
    s.loading = false;
  }
};

const loadEmails = async () => {
  const s = tabState.value.emails;
  s.loading = true;
  s.error = '';
  try {
    const r = await sitesApi.emails(props.site_id, {
      ...pickFilters(s.filters),
      sort_by: s.sortBy,
      sort_dir: s.sortDir,
      page: s.page,
      per_page: PER_PAGE,
    });
    s.items = r.items;
    s.pagination = r.pagination;
    s.loaded = true;
  } catch {
    s.items = [];
    s.error = 'Failed to load emails.';
  } finally {
    s.loading = false;
  }
};

const loadUpdates = async () => {
  const s = tabState.value.updates;
  s.loading = true;
  s.error = '';
  try {
    const r = await sitesApi.entryUpdates(props.site_id, {
      ...pickFilters(s.filters),
      sort_by: s.sortBy,
      sort_dir: s.sortDir,
      page: s.page,
      per_page: PER_PAGE,
    });
    s.items = r.items;
    s.pagination = r.pagination;
    s.loaded = true;
  } catch {
    s.items = [];
    s.error = 'Failed to load updates.';
  } finally {
    s.loading = false;
  }
};

const loaders = {
  entries: loadEntries,
  emails: loadEmails,
  updates: loadUpdates,
};

const ensureTabLoaded = (tab) => {
  const s = tabState.value[tab];
  if (!s || s.loaded || s.loading) return;
  loaders[tab]();
};

watch(activeTab, (t) => ensureTabLoaded(t));

const applyFilter = (tab) => {
  const s = tabState.value[tab];
  s.page = 1;
  loaders[tab]();
};

const clearFilter = (tab) => {
  const s = tabState.value[tab];
  for (const k of Object.keys(s.filters)) s.filters[k] = '';
  s.page = 1;
  loaders[tab]();
};

const changeSort = (tab, field) => {
  const s = tabState.value[tab];
  if (s.sortBy === field) {
    s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    s.sortBy = field;
    s.sortDir = 'desc';
  }
  s.page = 1;
  loaders[tab]();
};

const sortIndicator = (tab, field) => {
  const s = tabState.value[tab];
  if (s.sortBy !== field) return '';
  return s.sortDir === 'asc' ? ' ▲' : ' ▼';
};

const goPage = (tab, p) => {
  const s = tabState.value[tab];
  if (p < 1 || p > s.pagination.last_page) return;
  s.page = p;
  loaders[tab]();
};

// Returns a compact pager: first, last, current ± `window`, with '…' gaps.
const pages = (tab, window = 2) => {
  const s = tabState.value[tab];
  const last = s.pagination.last_page || 1;
  const cur = s.pagination.current_page || 1;
  if (last <= 1) return [{ type: 'page', n: 1 }];

  const set = new Set([1, last]);
  for (let i = cur - window; i <= cur + window; i++) {
    if (i >= 1 && i <= last) set.add(i);
  }
  const sorted = [...set].sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push({ type: 'gap', key: `g${prev}-${n}` });
    out.push({ type: 'page', n });
    prev = n;
  }
  return out;
};

const goEntryDetails = (entryRow) => {
  router.push({
    name: 'dashboard-data-entry',
    params: { site_id: props.site_id, entry_id: entryRow.entry_id },
  });
};

const GENERATORS = {
  emails: {
    key: 'emails',
    label: 'Emails',
    fn: sitesApi.generateEmails,
    fields: [
      { name: 'amount', label: 'Amount', min: 1, max: 10000, default: 10 },
      { name: 'length', label: 'Length (chars)', min: 1, max: 100000, default: 200 },
    ],
    reloadTab: 'emails',
  },
  entry_updates: {
    key: 'entry_updates',
    label: 'Entry updates',
    fn: sitesApi.generateEntryUpdates,
    fields: [
      { name: 'amount', label: 'Amount', min: 1, max: 10000, default: 10 },
    ],
    reloadTab: 'updates',
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
  if (!g) return;
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
  if (!generator.value) return;
  generating.value = true;
  generateError.value = '';
  generateResult.value = null;
  try {
    const payload = {};
    for (const f of generator.value.fields) {
      const raw = generateParams.value[f.name];
      const num = Number(raw);
      if (!Number.isFinite(num)) throw new Error(`${f.label} must be a number`);
      if (num < f.min || num > f.max) throw new Error(`${f.label} must be between ${f.min} and ${f.max}`);
      payload[f.name] = num;
    }
    generateResult.value = await generator.value.fn(props.site_id, payload);
    const reloadTab = generator.value.reloadTab;
    // Refresh stats (top section) — counts will have changed.
    loadSite();
    // Refresh the entries list since email/update counts per entry may have moved.
    if (tabState.value.entries.loaded) loadEntries();
    // Re-fetch the originating tab's list if it's already been loaded.
    if (reloadTab && tabState.value[reloadTab]?.loaded) loaders[reloadTab]();
  } catch (e) {
    generateError.value = e?.response?.data?.message || e?.message || 'Generation failed';
  } finally {
    generating.value = false;
  }
};

const formatMs = (v) => (typeof v === 'number' ? `${v.toFixed(2)} ms` : '—');

const showEmailModal = ref(false);
const viewingEmail = ref(null);
const emailView = ref('html');

const openEmail = (em) => {
  viewingEmail.value = em;
  emailView.value = em?.content_html ? 'html' : 'plain';
  showEmailModal.value = true;
};

const closeEmail = () => {
  showEmailModal.value = false;
  viewingEmail.value = null;
};

const resetAll = () => {
  for (const k of ['entries', 'emails', 'updates']) {
    const s = tabState.value[k];
    s.loaded = false;
    s.loading = false;
    s.items = [];
    s.page = 1;
    s.pagination = { current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0 };
    if ('error' in s) s.error = '';
    for (const fk of Object.keys(s.filters)) s.filters[fk] = '';
  }
};

watch(
  () => props.site_id,
  () => {
    resetAll();
    loadSite();
    ensureTabLoaded(activeTab.value);
  },
);

const stats = computed(() => site.value?.stats || null);

onMounted(async () => {
  await loadSite();
  ensureTabLoaded(activeTab.value);
});
</script>

<template>
  <DashboardLayout title="Data">
    <div v-if="siteLoading" class="text-slate-500">Loading site…</div>
    <div v-else-if="siteError" class="text-rose-600">{{ siteError }}</div>
    <div v-else-if="!site" class="text-slate-500">Site not found.</div>

    <div v-else>
      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div class="flex flex-wrap items-start gap-x-6 gap-y-2">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">Site</div>
            <div class="text-lg font-semibold">{{ site.name }}</div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">URL</div>
            <a :href="site.url" target="_blank" rel="noopener noreferrer"
              class="text-sm text-indigo-600 hover:underline break-all">
              {{ site.url }}
            </a>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">ID</div>
            <div class="text-sm font-mono">{{ site.id }}</div>
          </div>
          <div v-if="site.created_at">
            <div class="text-xs uppercase tracking-wide text-slate-400">Created</div>
            <div class="text-sm text-slate-600">{{ formatDate(site.created_at) }}</div>
          </div>
        </div>

        <div v-if="stats" class="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div class="bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div class="text-xs uppercase tracking-wide text-slate-400">Fields</div>
            <div class="text-xl font-semibold">{{ formatNumber(stats.fields) }}</div>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div class="text-xs uppercase tracking-wide text-slate-400">Emails</div>
            <div class="text-xl font-semibold">{{ formatNumber(stats.emails) }}</div>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div class="text-xs uppercase tracking-wide text-slate-400">Entry updates</div>
            <div class="text-xl font-semibold">{{ formatNumber(stats.entry_history) }}</div>
          </div>
        </div>
      </section>

      <div class="flex gap-1 border-b border-slate-200 mb-4">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
          :class="activeTab === 'entries'
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="setTab('entries')"
        >
          Entries
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
          :class="activeTab === 'emails'
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="setTab('emails')"
        >
          Emails
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
          :class="activeTab === 'updates'
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
          @click="setTab('updates')"
        >
          Entry updates
        </button>
      </div>

      <section v-if="activeTab === 'entries'">
        <div class="flex flex-wrap items-end gap-2 mb-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Filter by entry ID</label>
            <input
              v-model="tabState.entries.filters.entry_id"
              type="number"
              placeholder="Entry ID"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('entries')"
            />
          </div>
          <button class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="applyFilter('entries')">Apply</button>
          <button class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300" @click="clearFilter('entries')">Clear</button>
          <div class="ml-auto text-xs text-slate-500">Total: {{ tabState.entries.pagination.total }}</div>
        </div>

        <div v-if="tabState.entries.loading" class="text-slate-500">Loading entries…</div>
        <div v-else-if="tabState.entries.items.length === 0" class="text-slate-500 text-sm">No entries found.</div>
        <div v-else class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-slate-600">
              <tr>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('entries', 'entry_id')">
                  ID<span>{{ sortIndicator('entries', 'entry_id') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('entries', 'email_count')">
                  Emails<span>{{ sortIndicator('entries', 'email_count') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('entries', 'update_count')">
                  Updates<span>{{ sortIndicator('entries', 'update_count') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('entries', 'last_update')">
                  Last update<span>{{ sortIndicator('entries', 'last_update') }}</span>
                </th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="e in tabState.entries.items" :key="e.entry_id" class="hover:bg-slate-50">
                <td class="px-3 py-2 font-semibold">{{ e.entry_id }}</td>
                <td class="px-3 py-2">{{ e.email_count }}</td>
                <td class="px-3 py-2">{{ e.update_count }}</td>
                <td class="px-3 py-2 text-slate-500">{{ formatDate(e.last_update) }}</td>
                <td class="px-3 py-2 text-right">
                  <button class="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="goEntryDetails(e)">
                    Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="tabState.entries.pagination.last_page > 1" class="mt-3 flex gap-1 flex-wrap items-center">
          <button
            class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
            :disabled="tabState.entries.pagination.current_page <= 1"
            @click="goPage('entries', tabState.entries.pagination.current_page - 1)"
          >Prev</button>
          <template v-for="item in pages('entries')">
            <span v-if="item.type === 'gap'" :key="item.key" class="px-1.5 text-xs text-slate-400 select-none">…</span>
            <button
              v-else
              :key="item.n"
              class="px-2.5 py-1 text-xs rounded border"
              :class="item.n === tabState.entries.pagination.current_page
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 hover:bg-slate-100'"
              @click="goPage('entries', item.n)"
            >{{ item.n }}</button>
          </template>
          <button
            class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
            :disabled="tabState.entries.pagination.current_page >= tabState.entries.pagination.last_page"
            @click="goPage('entries', tabState.entries.pagination.current_page + 1)"
          >Next</button>
        </nav>
      </section>

      <section v-else-if="activeTab === 'emails'">
        <div class="flex flex-wrap items-end gap-2 mb-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Entry ID</label>
            <input
              v-model="tabState.emails.filters.entry_id"
              type="number"
              placeholder="Entry ID"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('emails')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Subject contains</label>
            <input
              v-model="tabState.emails.filters.subject"
              type="text"
              placeholder="e.g. weekly"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('emails')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              v-model="tabState.emails.filters.email_from"
              type="text"
              placeholder="From contains"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('emails')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              v-model="tabState.emails.filters.email_to"
              type="text"
              placeholder="To contains"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('emails')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <input
              v-model="tabState.emails.filters.status"
              type="number"
              placeholder="Status code"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('emails')"
            />
          </div>
          <button class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="applyFilter('emails')">Apply</button>
          <button class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300" @click="clearFilter('emails')">Clear</button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            @click="openGenerate('emails')"
          >Generate emails</button>
          <div class="ml-auto text-xs text-slate-500">Total: {{ tabState.emails.pagination.total }}</div>
        </div>

        <div v-if="tabState.emails.loading" class="text-slate-500">Loading emails…</div>
        <div v-else-if="tabState.emails.error" class="text-rose-600 text-sm">{{ tabState.emails.error }}</div>
        <div v-else-if="tabState.emails.items.length === 0" class="text-slate-500 text-sm">No emails found.</div>
        <div v-else class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-slate-600">
              <tr>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('emails', 'id')">
                  ID<span>{{ sortIndicator('emails', 'id') }}</span>
                </th>
                <th class="px-3 py-2">Entry</th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('emails', 'subject')">
                  Subject<span>{{ sortIndicator('emails', 'subject') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('emails', 'email_from')">
                  From<span>{{ sortIndicator('emails', 'email_from') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('emails', 'email_to')">
                  To<span>{{ sortIndicator('emails', 'email_to') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('emails', 'status')">
                  Status<span>{{ sortIndicator('emails', 'status') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('emails', 'date_sent')">
                  Sent<span>{{ sortIndicator('emails', 'date_sent') }}</span>
                </th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="em in tabState.emails.items" :key="em.id">
                <td class="px-3 py-2">{{ em.id }}</td>
                <td class="px-3 py-2 text-xs text-slate-500">{{ em.entry_id ?? '—' }}</td>
                <td class="px-3 py-2">{{ em.subject }}</td>
                <td class="px-3 py-2 text-xs">{{ em.email_from }}</td>
                <td class="px-3 py-2 text-xs">{{ em.email_to }}</td>
                <td class="px-3 py-2">{{ em.status }}</td>
                <td class="px-3 py-2 text-slate-500 text-xs">{{ formatDate(em.date_sent) }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                    @click="openEmail(em)"
                  >
                    View content
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="tabState.emails.pagination.last_page > 1" class="mt-3 flex gap-1 flex-wrap items-center">
          <button
            class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
            :disabled="tabState.emails.pagination.current_page <= 1"
            @click="goPage('emails', tabState.emails.pagination.current_page - 1)"
          >Prev</button>
          <template v-for="item in pages('emails')">
            <span v-if="item.type === 'gap'" :key="item.key" class="px-1.5 text-xs text-slate-400 select-none">…</span>
            <button
              v-else
              :key="item.n"
              class="px-2.5 py-1 text-xs rounded border"
              :class="item.n === tabState.emails.pagination.current_page
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 hover:bg-slate-100'"
              @click="goPage('emails', item.n)"
            >{{ item.n }}</button>
          </template>
          <button
            class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
            :disabled="tabState.emails.pagination.current_page >= tabState.emails.pagination.last_page"
            @click="goPage('emails', tabState.emails.pagination.current_page + 1)"
          >Next</button>
        </nav>
      </section>

      <section v-else-if="activeTab === 'updates'">
        <div class="flex flex-wrap items-end gap-2 mb-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Entry ID</label>
            <input
              v-model="tabState.updates.filters.entry_id"
              type="number"
              placeholder="Entry ID"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('updates')"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Field ID</label>
            <input
              v-model="tabState.updates.filters.field_id"
              type="number"
              placeholder="Field ID"
              class="rounded border border-slate-300 px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keyup.enter="applyFilter('updates')"
            />
          </div>
          <button class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="applyFilter('updates')">Apply</button>
          <button class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300" @click="clearFilter('updates')">Clear</button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            @click="openGenerate('entry_updates')"
          >Generate entry updates</button>
          <div class="ml-auto text-xs text-slate-500">Total: {{ tabState.updates.pagination.total }}</div>
        </div>

        <div v-if="tabState.updates.loading" class="text-slate-500">Loading updates…</div>
        <div v-else-if="tabState.updates.error" class="text-rose-600 text-sm">{{ tabState.updates.error }}</div>
        <div v-else-if="tabState.updates.items.length === 0" class="text-slate-500 text-sm">No updates found.</div>
        <div v-else class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-slate-600">
              <tr>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('updates', 'id')">
                  ID<span>{{ sortIndicator('updates', 'id') }}</span>
                </th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('updates', 'entry_id')">
                  Entry<span>{{ sortIndicator('updates', 'entry_id') }}</span>
                </th>
                <th class="px-3 py-2">Type</th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('updates', 'field_id')">
                  Field<span>{{ sortIndicator('updates', 'field_id') }}</span>
                </th>
                <th class="px-3 py-2">Old value</th>
                <th class="px-3 py-2">New value</th>
                <th class="px-3 py-2 cursor-pointer select-none" @click="changeSort('updates', 'change_date')">
                  Change date<span>{{ sortIndicator('updates', 'change_date') }}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="u in tabState.updates.items" :key="u.id">
                <td class="px-3 py-2">{{ u.id }}</td>
                <td class="px-3 py-2 text-xs text-slate-500">{{ u.entry_id ?? '—' }}</td>
                <td class="px-3 py-2">{{ u.update_type }}</td>
                <td class="px-3 py-2">
                  <span v-if="u.field_label || u.field_key" class="font-semibold">
                    {{ u.field_label || u.field_key }}
                  </span>
                  <span v-else class="text-slate-500">#{{ u.field_id }}</span>
                </td>
                <td class="px-3 py-2 font-mono text-xs"><code>{{ u.old_value }}</code></td>
                <td class="px-3 py-2 font-mono text-xs"><code>{{ u.new_value }}</code></td>
                <td class="px-3 py-2 text-slate-500 text-xs">{{ formatDate(u.change_date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="tabState.updates.pagination.last_page > 1" class="mt-3 flex gap-1 flex-wrap items-center">
          <button
            class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
            :disabled="tabState.updates.pagination.current_page <= 1"
            @click="goPage('updates', tabState.updates.pagination.current_page - 1)"
          >Prev</button>
          <template v-for="item in pages('updates')">
            <span v-if="item.type === 'gap'" :key="item.key" class="px-1.5 text-xs text-slate-400 select-none">…</span>
            <button
              v-else
              :key="item.n"
              class="px-2.5 py-1 text-xs rounded border"
              :class="item.n === tabState.updates.pagination.current_page
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 hover:bg-slate-100'"
              @click="goPage('updates', item.n)"
            >{{ item.n }}</button>
          </template>
          <button
            class="px-2.5 py-1 text-xs rounded border border-slate-200 disabled:opacity-50"
            :disabled="tabState.updates.pagination.current_page >= tabState.updates.pagination.last_page"
            @click="goPage('updates', tabState.updates.pagination.current_page + 1)"
          >Next</button>
        </nav>
      </section>
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
            >Cancel</button>
            <button
              type="submit"
              class="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
              :disabled="generating"
            >{{ generating ? 'Generating…' : 'Generate' }}</button>
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
            >Close</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEmailModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div class="flex items-start justify-between p-4 border-b border-slate-200">
          <div>
            <h5 class="text-lg font-semibold">{{ viewingEmail?.subject || '(no subject)' }}</h5>
            <div class="text-xs text-slate-500 mt-1 space-y-0.5">
              <div><span class="font-semibold text-slate-600">Entry:</span> {{ viewingEmail?.entry_id ?? '—' }}</div>
              <div><span class="font-semibold text-slate-600">From:</span> {{ viewingEmail?.email_from || '—' }}</div>
              <div><span class="font-semibold text-slate-600">To:</span> {{ viewingEmail?.email_to || '—' }}</div>
              <div><span class="font-semibold text-slate-600">Sent:</span> {{ formatDate(viewingEmail?.date_sent) || '—' }}</div>
            </div>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 text-2xl leading-none ml-3"
            @click="closeEmail"
          >&times;</button>
        </div>

        <div class="px-4 pt-3 flex gap-1 border-b border-slate-200">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition"
            :class="emailView === 'html'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'"
            :disabled="!viewingEmail?.content_html"
            @click="emailView = 'html'"
          >HTML</button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition"
            :class="emailView === 'plain'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'"
            :disabled="!viewingEmail?.content_plain"
            @click="emailView = 'plain'"
          >Plain text</button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <template v-if="emailView === 'html'">
            <iframe
              v-if="viewingEmail?.content_html"
              :srcdoc="viewingEmail.content_html"
              class="w-full min-h-[400px] border border-slate-200 rounded bg-white"
              sandbox=""
            />
            <div v-else class="text-sm text-slate-500">No HTML body.</div>
          </template>
          <template v-else>
            <pre
              v-if="viewingEmail?.content_plain"
              class="text-xs whitespace-pre-wrap font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded p-3"
            >{{ viewingEmail.content_plain }}</pre>
            <div v-else class="text-sm text-slate-500">No plain-text body.</div>
          </template>
        </div>

        <div class="p-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300"
            @click="closeEmail"
          >Close</button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
