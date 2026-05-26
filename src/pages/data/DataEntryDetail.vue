<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import * as dataApi from '@/api/data';
import { formatDate } from '@/utils/format';

const props = defineProps({
  site_id: { type: [String, Number], required: true },
  entry_id: { type: [String, Number], required: true },
});

const router = useRouter();

const activeTab = ref('updates');
const updates = ref([]);
const emails = ref([]);
const loadingUpdates = ref(false);
const loadingEmails = ref(false);
const updatesLoaded = ref(false);
const emailsLoaded = ref(false);
const error = ref('');

const loadUpdates = async () => {
  loadingUpdates.value = true;
  error.value = '';
  try {
    const result = await dataApi.entryUpdates(props.site_id, props.entry_id);
    updates.value = result.updates;
    updatesLoaded.value = true;
  } catch {
    error.value = 'Failed to load entry updates.';
  } finally {
    loadingUpdates.value = false;
  }
};

const loadEmails = async () => {
  loadingEmails.value = true;
  error.value = '';
  try {
    emails.value = await dataApi.entryEmails(props.site_id, props.entry_id);
    emailsLoaded.value = true;
  } catch {
    error.value = 'Failed to load emails.';
  } finally {
    loadingEmails.value = false;
  }
};

const selectTab = (t) => {
  activeTab.value = t;
  if (t === 'updates' && !updatesLoaded.value) loadUpdates();
  if (t === 'emails' && !emailsLoaded.value) loadEmails();
};

const back = () => router.push({ name: 'dashboard-data-site', params: { site_id: props.site_id } });

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

onMounted(loadUpdates);
</script>

<template>
  <DashboardLayout title="Entry details">
    <button type="button" class="text-sm text-indigo-600 hover:underline mb-4" @click="back">← Back to Data</button>

    <h2 class="text-xl font-semibold mb-3">
      Entry #{{ entry_id }}
      <span class="text-sm font-normal text-slate-500">(site {{ site_id }})</span>
    </h2>

    <p v-if="error" class="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded px-3 py-2 mb-3">{{ error }}</p>

    <div class="flex gap-1 border-b border-slate-200 mb-4">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
        :class="activeTab === 'updates'
          ? 'border-indigo-600 text-indigo-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="selectTab('updates')"
      >
        Entry updates
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition"
        :class="activeTab === 'emails'
          ? 'border-indigo-600 text-indigo-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="selectTab('emails')"
      >
        Emails
      </button>
    </div>

    <div v-if="activeTab === 'updates'">
      <div v-if="loadingUpdates" class="text-slate-500">Loading updates…</div>
      <div v-else-if="updates.length === 0" class="text-slate-500 text-sm">No updates.</div>
      <div v-else class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-3 py-2">ID</th>
              <th class="px-3 py-2">Type</th>
              <th class="px-3 py-2">Field</th>
              <th class="px-3 py-2">Old value</th>
              <th class="px-3 py-2">New value</th>
              <th class="px-3 py-2">Change date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="u in updates" :key="u.id">
              <td class="px-3 py-2">{{ u.id }}</td>
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
    </div>

    <div v-else-if="activeTab === 'emails'">
      <div v-if="loadingEmails" class="text-slate-500">Loading emails…</div>
      <div v-else-if="emails.length === 0" class="text-slate-500 text-sm">No emails.</div>
      <div v-else class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-3 py-2">ID</th>
              <th class="px-3 py-2">Subject</th>
              <th class="px-3 py-2">From</th>
              <th class="px-3 py-2">To</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Sent</th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="em in emails" :key="em.id">
              <td class="px-3 py-2">{{ em.id }}</td>
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
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showEmailModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div class="flex items-start justify-between p-4 border-b border-slate-200">
          <div>
            <h5 class="text-lg font-semibold">{{ viewingEmail?.subject || '(no subject)' }}</h5>
            <div class="text-xs text-slate-500 mt-1 space-y-0.5">
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
          >
            HTML
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition"
            :class="emailView === 'plain'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'"
            :disabled="!viewingEmail?.content_plain"
            @click="emailView = 'plain'"
          >
            Plain text
          </button>
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
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
