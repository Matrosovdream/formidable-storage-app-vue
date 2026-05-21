import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import MockAdapter from 'axios-mock-adapter';
import { http, TOKEN_STORAGE_KEY } from '@/api/http';
import Login from '@/pages/Login.vue';

let mock;
let router;

const makeRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: { template: '<div>register</div>' } },
    { path: '/dashboard', name: 'dashboard', component: { template: '<div>dashboard</div>' } },
  ],
});

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  mock = new MockAdapter(http);
  router = makeRouter();
  router.push('/login');
  await router.isReady();
});

afterEach(() => { mock.restore(); });

const mountLogin = () => mount(Login, { global: { plugins: [router] } });

describe('Login.vue', () => {
  it('submits credentials and routes to dashboard on success', async () => {
    mock.onPost('/api/login').reply(200, {
      user: { id: 1, name: 'A', email: 'a@b.c', created_at: 't', updated_at: 't' },
      token: '1|tok',
      message: 'Logged in',
    });

    const wrapper = mountLogin();
    await wrapper.get('[data-testid="login-email"]').setValue('a@b.c');
    await wrapper.get('[data-testid="login-password"]').setValue('passw0rd!');
    await wrapper.get('[data-testid="login-form"]').trigger('submit.prevent');
    await flushPromises();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('1|tok');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('renders 422 field errors inline', async () => {
    mock.onPost('/api/login').reply(422, {
      success: false,
      code: 422,
      message: 'The given data was invalid.',
      errors: { email: ['These credentials do not match our records.'] },
    });

    const wrapper = mountLogin();
    await wrapper.get('[data-testid="login-email"]').setValue('wrong@b.c');
    await wrapper.get('[data-testid="login-password"]').setValue('bad');
    await wrapper.get('[data-testid="login-form"]').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.get('[data-testid="login-error-email"]').text())
      .toContain('These credentials do not match our records.');
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('shows a general error when 4xx response has no field map', async () => {
    mock.onPost('/api/login').reply(500, { success: false, code: 500, message: 'boom' });

    const wrapper = mountLogin();
    await wrapper.get('[data-testid="login-email"]').setValue('a@b.c');
    await wrapper.get('[data-testid="login-password"]').setValue('passw0rd!');
    await wrapper.get('[data-testid="login-form"]').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.get('[data-testid="login-error-general"]').text()).toContain('boom');
  });
});
