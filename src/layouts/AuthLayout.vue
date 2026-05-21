<script setup>
defineProps({
  title: { type: String, default: 'Auth' },
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md bg-white shadow rounded-lg p-8">
      <h1 class="text-2xl font-semibold text-center mb-6">{{ title }}</h1>
      <slot />
    </div>
  </div>
</template>
