<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import * as sitesApi from '@/api/sites';
import { parseApiError } from '@/utils/errors';

const router = useRouter();
const name = ref('');
const url = ref('');
const loading = ref(false);
const generalError = ref('');
const fieldErrors = ref({});
const createdSite = ref(null);
const copied = ref(false);

const isValidUrl = (v) => {
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const submit = async () => {
  fieldErrors.value = {};
  generalError.value = '';
  if (!isValidUrl(url.value)) {
    fieldErrors.value = { url: ['Please enter a valid URL starting with http:// or https://'] };
    return;
  }
  loading.value = true;
  try {
    createdSite.value = await sitesApi.create({ name: name.value, url: url.value });
  } catch (e) {
    const parsed = parseApiError(e);
    fieldErrors.value = parsed.fields;
    if (Object.keys(parsed.fields).length === 0) generalError.value = parsed.message;
  } finally {
    loading.value = false;
  }
};

const copyToken = async () => {
  if (!createdSite.value?.token) return;
  try {
    await navigator.clipboard.writeText(createdSite.value.token);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Clipboard unavailable — ignore.
  }
};

const back = () => router.push({ name: 'dashboard-sites' });
</script>

<template>
  <DashboardLayout title="Add site">
    <button type="button" class="text-sm text-indigo-600 hover:underline mb-4" @click="back">← Back to sites</button>

    <div v-if="!createdSite" class="max-w-xl bg-white border border-slate-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">Add new site</h2>

      <p v-if="generalError" class="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded px-3 py-2 mb-3">
        {{ generalError }}
      </p>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Site name</label>
          <input
            v-model="name"
            required
            type="text"
            placeholder="Enter site name"
            class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p v-if="fieldErrors.name" class="text-sm text-rose-600 mt-1">{{ fieldErrors.name[0] }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Site URL</label>
          <input
            v-model="url"
            required
            type="text"
            placeholder="https://example.com"
            class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p v-if="fieldErrors.url" class="text-sm text-rose-600 mt-1">{{ fieldErrors.url[0] }}</p>
        </div>
        <button type="submit" :disabled="loading"
          class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2 rounded">
          {{ loading ? 'Saving…' : 'Create site' }}
        </button>
      </form>
    </div>

    <div v-else class="max-w-xl bg-white border border-emerald-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-emerald-700 mb-2">Site created</h2>
      <p class="text-sm text-slate-600 mb-4">
        Save this REST token somewhere safe — it grants access to <strong>{{ createdSite.name }}</strong>.
      </p>
      <div class="bg-slate-100 border border-slate-200 rounded px-3 py-2 font-mono text-xs break-all mb-3">
        {{ createdSite.token }}
      </div>
      <div class="flex gap-2">
        <button type="button" class="text-sm px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white" @click="copyToken">
          {{ copied ? 'Copied!' : 'Copy token' }}
        </button>
        <button type="button" class="text-sm px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300" @click="back">
          Done
        </button>
      </div>
    </div>
  </DashboardLayout>
</template>
