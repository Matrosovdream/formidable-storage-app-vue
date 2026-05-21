import { http } from './http';

export async function login(credentials) {
  const { data } = await http.post('/api/login', credentials);
  return { user: data.user, token: data.token, message: data.message };
}

export async function register(payload) {
  const { data } = await http.post('/api/register', payload);
  return { user: data.user, token: data.token, message: data.message };
}

export async function me() {
  const { data } = await http.get('/api/user');
  return data;
}

export async function logout() {
  const { data } = await http.post('/api/logout');
  return data;
}
