import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { http } from '@/api/http';
import * as sitesApi from '@/api/sites';

let mock;
beforeEach(() => { mock = new MockAdapter(http); });
afterEach(() => { mock.restore(); });

describe('sites API', () => {
  it('list() unwraps { data: [...] }', async () => {
    mock.onGet('/api/sites/list').reply(200, {
      data: [
        { id: 1, name: 'A', url: 'https://a', created_at: 't', updated_at: 't' },
        { id: 2, name: 'B', url: 'https://b', created_at: 't', updated_at: 't' },
      ],
    });
    const result = await sitesApi.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('A');
  });

  it('list() returns [] for unexpected shape', async () => {
    mock.onGet('/api/sites/list').reply(200, {});
    expect(await sitesApi.list()).toEqual([]);
  });

  it('view() returns the SiteWithStats object directly (no data wrapper)', async () => {
    mock.onGet('/api/sites/view/42').reply(200, {
      id: 42, name: 'My', url: 'https://my', token: 'tok',
      stats: { fields: 5, emails: 10, entry_history: 3, queue: { fields: 0, emails: 0, entry_history: 0, shipment_history: 0 } },
      created_at: 't', updated_at: 't',
    });
    const site = await sitesApi.view(42);
    expect(site.id).toBe(42);
    expect(site.stats.fields).toBe(5);
    expect(site.token).toBe('tok');
  });

  it('create() POSTs to /api/sites/store', async () => {
    mock.onPost('/api/sites/store').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ name: 'New', url: 'https://x' });
      return [201, { id: 9, name: 'New', url: 'https://x', token: 'tok', stats: {}, created_at: 't', updated_at: 't' }];
    });
    const site = await sitesApi.create({ name: 'New', url: 'https://x' });
    expect(site.id).toBe(9);
    expect(site.token).toBe('tok');
  });

  it('remove() calls DELETE /api/sites/delete/{id}', async () => {
    mock.onDelete('/api/sites/delete/5').reply(200, { success: true });
    const result = await sitesApi.remove(5);
    expect(result.success).toBe(true);
  });
});
