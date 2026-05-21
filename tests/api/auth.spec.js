import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { http } from '@/api/http';
import * as authApi from '@/api/auth';

let mock;

beforeEach(() => {
  mock = new MockAdapter(http);
  localStorage.clear();
});

afterEach(() => {
  mock.restore();
});

describe('auth API', () => {
  it('POST /api/login returns user + token', async () => {
    mock.onPost('/api/login').reply(200, {
      user: { id: 1, name: 'Alice', email: 'a@b.c', created_at: 't', updated_at: 't' },
      token: '1|abc',
      message: 'Logged in',
    });

    const result = await authApi.login({ email: 'a@b.c', password: 'x' });
    expect(result.token).toBe('1|abc');
    expect(result.user.id).toBe(1);
    expect(result.message).toBe('Logged in');
  });

  it('POST /api/register returns user + token', async () => {
    mock.onPost('/api/register').reply(201, {
      user: { id: 2, name: 'Bob', email: 'b@b.c', created_at: 't', updated_at: 't' },
      token: '2|xyz',
      message: 'Registered',
    });

    const result = await authApi.register({
      name: 'Bob', email: 'b@b.c', password: 'password12', password_confirmation: 'password12',
    });
    expect(result.token).toBe('2|xyz');
  });

  it('GET /api/user returns user when authed', async () => {
    mock.onGet('/api/user').reply(200, { id: 1, name: 'Alice', email: 'a@b.c', created_at: 't', updated_at: 't' });
    const user = await authApi.me();
    expect(user.id).toBe(1);
  });

  it('GET /api/user returns null when not authed', async () => {
    mock.onGet('/api/user').reply(200, null);
    const user = await authApi.me();
    expect(user).toBeNull();
  });

  it('attaches Authorization header when token is stored', async () => {
    localStorage.setItem('auth_token', '7|tok');
    mock.onGet('/api/user').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer 7|tok');
      return [200, { id: 7, name: 'X', email: 'x@y.z', created_at: 't', updated_at: 't' }];
    });
    await authApi.me();
  });

  it('does NOT attach Authorization when no token stored', async () => {
    mock.onGet('/api/user').reply((config) => {
      expect(config.headers.Authorization).toBeUndefined();
      return [200, null];
    });
    await authApi.me();
  });
});
