<script setup>
import { RouterLink } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
</script>

<template>
  <DashboardLayout title="Dashboard">
    <h2 class="text-xl font-semibold mb-2">Welcome to your dashboard</h2>
    <p class="text-slate-600 mb-6">Use the menu on the left to manage your sites and data.</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      <RouterLink
        :to="{ name: 'dashboard-sites' }"
        class="block bg-white border border-slate-200 rounded-lg p-5 hover:shadow transition"
      >
        <div class="text-lg font-semibold mb-1">Sites</div>
        <div class="text-sm text-slate-500">Manage your registered sites and REST tokens.</div>
      </RouterLink>
      <RouterLink
        :to="{ name: 'dashboard-data' }"
        class="block bg-white border border-slate-200 rounded-lg p-5 hover:shadow transition"
      >
        <div class="text-lg font-semibold mb-1">Data</div>
        <div class="text-sm text-slate-500">Browse entries, updates and email logs.</div>
      </RouterLink>
    </div>
  </DashboardLayout>
</template>
