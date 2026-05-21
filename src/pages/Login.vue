<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { parseApiError } from '@/utils/errors';
import AuthLayout from '@/layouts/AuthLayout.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = ref({ email: '', password: '', remember: false });
const errors = ref({});
const generalError = ref('');
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  errors.value = {};
  generalError.value = '';
  try {
    await auth.login(form.value);
    const redirect = route.query.redirect;
    router.push(typeof redirect === 'string' ? redirect : { name: 'dashboard' });
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
  <AuthLayout title="Login">
    <form @submit.prevent="submit" class="space-y-4" data-testid="login-form">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          data-testid="login-email"
        />
        <p v-if="errors.email" class="text-sm text-rose-600 mt-1" data-testid="login-error-email">
          {{ errors.email[0] }}
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          v-model="form.password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          data-testid="login-password"
        />
        <p v-if="errors.password" class="text-sm text-rose-600 mt-1" data-testid="login-error-password">
          {{ errors.password[0] }}
        </p>
      </div>

      <label class="flex items-center gap-2 text-sm text-slate-600">
        <input v-model="form.remember" type="checkbox" class="rounded border-slate-300" />
        Remember me
      </label>

      <p v-if="generalError" class="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded px-3 py-2" data-testid="login-error-general">
        {{ generalError }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded transition"
        data-testid="login-submit"
      >
        {{ loading ? 'Loading…' : 'Login' }}
      </button>

      <p class="text-center text-sm text-slate-600">
        No account?
        <router-link :to="{ name: 'register' }" class="text-indigo-600 hover:underline">Register</router-link>
      </p>
    </form>
  </AuthLayout>
</template>
