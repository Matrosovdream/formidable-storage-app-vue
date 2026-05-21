<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import DashboardHeader from '@/components/layout/DashboardHeader.vue';
import DashboardSidebar from '@/components/layout/DashboardSidebar.vue';

defineProps({
  title: { type: String, default: 'Dashboard' },
});

const router = useRouter();
const auth = useAuthStore();

const logout = async () => {
  await auth.logout();
  router.push({ name: 'login' });
};

onMounted(async () => {
  if (!auth.user) await auth.fetchUser();
  if (!auth.user) router.push({ name: 'login' });
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50">
    <DashboardHeader :title="title" :user="auth.user" @logout="logout" />
    <div class="flex flex-1">
      <aside class="w-56 bg-white border-r border-slate-200 shrink-0">
        <DashboardSidebar />
      </aside>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
