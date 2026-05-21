import { http } from './http';

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
