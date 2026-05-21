import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import MockAdapter from 'axios-mock-adapter';
import { http, TOKEN_STORAGE_KEY } from '@/api/http';
import { createAppRouter } from '@/router/index.js';

let mock;
let router;

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  mock = new MockAdapter(http);
  router = createAppRouter(createMemoryHistory());
});

afterEach(() => { mock.restore(); });

describe('router guards', () => {
  it('redirects unauthenticated visit to /dashboard → /login', async () => {
    mock.onGet('/api/user').reply(200, null);
    await router.push('/dashboard');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('redirects authenticated visit to /login → /dashboard', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, '1|tok');
    mock.onGet('/api/user').reply(200, { id: 1, name: 'A', email: 'a@b.c', created_at: 't', updated_at: 't' });
    await router.push('/login');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('allows authenticated visit to /dashboard', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, '1|tok');
    mock.onGet('/api/user').reply(200, { id: 1, name: 'A', email: 'a@b.c', created_at: 't', updated_at: 't' });
    await router.push('/dashboard');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});
