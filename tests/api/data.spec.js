import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { http } from '@/api/http';
import * as dataApi from '@/api/data';

let mock;
beforeEach(() => { mock = new MockAdapter(http); });
afterEach(() => { mock.restore(); });

describe('data API', () => {
  it('entries() normalizes Laravel paginator into { items, pagination }', async () => {
    mock.onGet('/api/data/entries/3').reply(200, {
      current_page: 2,
      last_page: 4,
      per_page: 25,
      total: 100,
      data: [
        { entry_id: 1, site_id: 3, email_count: 0, update_count: 5, last_update: '2025-01-01T00:00:00Z' },
        { entry_id: 2, site_id: 3, email_count: 2, update_count: 1, last_update: null },
      ],
      first_page_url: '/x?page=1',
      last_page_url: '/x?page=4',
      next_page_url: '/x?page=3',
      prev_page_url: '/x?page=1',
      from: 26,
      to: 27,
      path: '/x',
    });

    const result = await dataApi.entries(3, { page: 2, per_page: 25 });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].email_count).toBe(0);
    expect(result.items[0].update_count).toBe(5);
    expect(result.pagination.current_page).toBe(2);
    expect(result.pagination.last_page).toBe(4);
    expect(result.pagination.total).toBe(100);
    expect(result.pagination.per_page).toBe(25);
  });

  it('entries() defaults pagination when payload empty', async () => {
    mock.onGet('/api/data/entries/3').reply(200, null);
    const result = await dataApi.entries(3);
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('entryUpdates() returns flat { entryId, updates } shape', async () => {
    mock.onGet('/api/data/entries/3/77/updates').reply(200, {
      entry_id: 77,
      updates: [
        { id: 1, field_id: 10, field_key: 'name', field_label: 'Name', update_type: 'updated', old_value: 'a', new_value: 'b', change_date: '2025-01-01T00:00:00Z', created_at: 't' },
      ],
    });
    const result = await dataApi.entryUpdates(3, 77);
    expect(result.entryId).toBe(77);
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].field_label).toBe('Name');
  });

  it('entryEmails() unwraps { data: [...] }', async () => {
    mock.onGet('/api/data/entries/3/77/emails').reply(200, {
      data: [
        { id: 1, site_id: 3, status: 0, attachments: 0, subject: 'hi', email_from: 'x@y', email_to: 'a@b', created_at: 't', updated_at: 't' },
      ],
    });
    const result = await dataApi.entryEmails(3, 77);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('hi');
  });
});
