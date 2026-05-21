import { http } from './http';

/**
 * Normalizes a Laravel-shaped paginator into a stable shape for the UI.
 * Input: { current_page, last_page, per_page, total, data: [...], ... }
 * Output: { items, pagination: { current_page, last_page, per_page, total } }
 */
function normalizePaginator(payload) {
  if (!payload) return { items: [], pagination: { current_page: 1, last_page: 1, per_page: 25, total: 0 } };
  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    pagination: {
      current_page: payload.current_page ?? 1,
      last_page: payload.last_page ?? 1,
      per_page: payload.per_page ?? 25,
      total: payload.total ?? 0,
    },
  };
}

export async function entries(siteId, params = {}) {
  const { data } = await http.get(`/api/data/entries/${siteId}`, { params });
  return normalizePaginator(data);
}

export async function entryUpdates(siteId, entryId) {
  const { data } = await http.get(`/api/data/entries/${siteId}/${entryId}/updates`);
  // Spec: { entry_id, updates: [...] }
  return {
    entryId: data?.entry_id ?? entryId,
    updates: Array.isArray(data?.updates) ? data.updates : [],
  };
}

export async function entryEmails(siteId, entryId) {
  const { data } = await http.get(`/api/data/entries/${siteId}/${entryId}/emails`);
  // Spec: { data: [...] } of EmailLogItem
  return Array.isArray(data?.data) ? data.data : [];
}
