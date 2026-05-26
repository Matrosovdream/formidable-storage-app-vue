import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue'), meta: { guest: true } },
  { path: '/register', name: 'register', component: () => import('@/pages/Register.vue'), meta: { guest: true } },

  { path: '/dashboard', name: 'dashboard', component: () => import('@/pages/Dashboard.vue'), meta: { requiresAuth: true } },

  { path: '/dashboard/sites', name: 'dashboard-sites', component: () => import('@/pages/sites/SitesList.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard/sites/add', name: 'dashboard-site-add', component: () => import('@/pages/sites/SiteAdd.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard/sites/:site_id', name: 'dashboard-site-view', component: () => import('@/pages/sites/SiteView.vue'), meta: { requiresAuth: true }, props: true },

  { path: '/dashboard/data', name: 'dashboard-data', component: () => import('@/pages/data/DataIndex.vue'), meta: { requiresAuth: true } },
  {
    path: '/dashboard/data/:site_id',
    name: 'dashboard-data-site',
    component: () => import('@/pages/data/DataSite.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: '/dashboard/data/:site_id/entry/:entry_id',
    name: 'dashboard-data-entry',
    component: () => import('@/pages/data/DataEntryDetail.vue'),
    meta: { requiresAuth: true },
    props: true,
  },

  { path: '/:pathMatch(.*)*', redirect: '/login' },
];

export async function authGuard(to) {
  const auth = useAuthStore();

  // Hit /api/user once per page load to confirm the token is still good.
  // Endpoint never returns 401 — it returns the user or null.
  if (!auth.initialized) {
    await auth.fetchUser();
  }

  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined };
  }
  if (to.meta.guest && auth.user) {
    return { name: 'dashboard' };
  }
  return true;
}

export function createAppRouter(history = createWebHistory()) {
  const router = createRouter({ history, routes });
  router.beforeEach(authGuard);
  return router;
}

export default createAppRouter();
