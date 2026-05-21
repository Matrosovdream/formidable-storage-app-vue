<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { parseApiError } from '@/utils/errors';
import AuthLayout from '@/layouts/AuthLayout.vue';

const router = useRouter();
const auth = useAuthStore();

const form = ref({ name: '', email: '', password: '', password_confirmation: '' });
const errors = ref({});
const generalError = ref('');
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  errors.value = {};
  generalError.value = '';
  try {
    await auth.register(form.value);
    router.push({ name: 'dashboard' });
  } catch (err) {
    const parsed = parseApiError(err);
    errors.value = parsed.fields;
    if (Object.keys(parsed.fields).length === 0) {
      generalError.value = parsed.message;
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthLayout title="Register">
    <form @submit.prevent="submit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input v-model="form.name" type="text" required
          class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <p v-if="errors.name" class="text-sm text-rose-600 mt-1">{{ errors.name[0] }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input v-model="form.email" type="email" required autocomplete="email"
          class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <p v-if="errors.email" class="text-sm text-rose-600 mt-1">{{ errors.email[0] }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password"
          class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <p v-if="errors.password" class="text-sm text-rose-600 mt-1">{{ errors.password[0] }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
        <input v-model="form.password_confirmation" type="password" required minlength="8" autocomplete="new-password"
          class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <p v-if="generalError" class="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded px-3 py-2">
        {{ generalError }}
      </p>

      <button type="submit" :disabled="loading"
        class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2 rounded transition">
        {{ loading ? 'Loading…' : 'Register' }}
      </button>

      <p class="text-center text-sm text-slate-600">
        Already have an account?
        <router-link :to="{ name: 'login' }" class="text-indigo-600 hover:underline">Login</router-link>
      </p>
    </form>
  </AuthLayout>
</template>
