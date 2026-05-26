import { http } from './http';

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

export async function list() {
  const { data } = await http.get('/api/sites/list');
  return Array.isArray(data?.data) ? data.data : [];
}

export async function view(siteId) {
  const { data } = await http.get(`/api/sites/view/${siteId}`);
  // Spec: returns SiteWithStats directly (no { data } wrapper).
  // Tolerate either shape just in case.
  return data?.data ?? data;
}

export async function createFormMeta() {
  const { data } = await http.get('/api/sites/create');
  return data?.form?.fields ?? [];
}

export async function create(payload) {
  const { data } = await http.post('/api/sites/store', payload);
  return data?.data ?? data;
}

export async function remove(siteId) {
  const { data } = await http.delete(`/api/sites/delete/${siteId}`);
  return data;
}

export async function emails(siteId, params = {}) {
  const { data } = await http.get(`/api/sites/view/${siteId}/emails`, { params });
  return normalizePaginator(data);
}

export async function entryUpdates(siteId, params = {}) {
  const { data } = await http.get(`/api/sites/view/${siteId}/entry-updates`, { params });
  return normalizePaginator(data);
}

export async function generateEmails(siteId, { amount, length } = {}) {
  const params = {};
  if (amount != null) params.amount = amount;
  if (length != null) params.length = length;
  const { data } = await http.post(`/api/sites/generate/${siteId}/emails`, null, { params });
  return data;
}

export async function generateFields(siteId, { amount } = {}) {
  const params = {};
  if (amount != null) params.amount = amount;
  const { data } = await http.post(`/api/sites/generate/${siteId}/fields`, null, { params });
  return data;
}

export async function generateEntryUpdates(siteId, { amount } = {}) {
  const params = {};
  if (amount != null) params.amount = amount;
  const { data } = await http.post(`/api/sites/generate/${siteId}/entry-updates`, null, { params });
  return data;
}
