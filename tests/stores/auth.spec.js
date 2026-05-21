import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import MockAdapter from 'axios-mock-adapter';
import { http, TOKEN_STORAGE_KEY } from '@/api/http';
import { useAuthStore } from '@/stores/auth';

let mock;

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  mock = new MockAdapter(http);
});
afterEach(() => { mock.restore(); });

describe('auth store', () => {
  it('hydrate() picks up token from localStorage', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, '5|live');
    const store = useAuthStore();
    store.hydrate();
    expect(store.token).toBe('5|live');
    expect(store.isAuthenticated).toBe(true);
  });

  it('login() stores token and user', async () => {
    mock.onPost('/api/login').reply(200, {
      user: { id: 1, name: 'A', email: 'a@b.c', created_at: 't', updated_at: 't' },
      token: '1|tok',
      message: 'ok',
    });
    const store = useAuthStore();
    await store.login({ email: 'a@b.c', password: 'x' });
    expect(store.token).toBe('1|tok');
    expect(store.user.email).toBe('a@b.c');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('1|tok');
  });

  it('logout() clears state even if server call fails', async () => {
    mock.onPost('/api/logout').reply(500);
    const store = useAuthStore();
    store.setToken('1|tok');
    store.user = { id: 1, name: 'A', email: 'a@b.c', created_at: 't', updated_at: 't' };
    await store.logout();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('fetchUser() handles null payload (unauthenticated)', async () => {
    mock.onGet('/api/user').reply(200, null);
    const store = useAuthStore();
    const u = await store.fetchUser();
    expect(u).toBeNull();
    expect(store.user).toBeNull();
    expect(store.initialized).toBe(true);
  });

  it('401 response triggers clear via unauthorized handler', async () => {
    const store = useAuthStore();
    store.hydrate();
    store.setToken('1|tok');
    mock.onGet('/api/sites/list').reply(401, { success: false, code: 401, message: 'Unauthenticated.' });

    await http.get('/api/sites/list').catch(() => {});
    expect(store.token).toBeNull();
  });
});
