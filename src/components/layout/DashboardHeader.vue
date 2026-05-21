<script setup>
defineProps({
  title: { type: String, default: 'Dashboard' },
  user: { type: Object, default: null },
});
const emit = defineEmits(['logout']);
</script>

<template>
  <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
    <span class="text-lg font-semibold">{{ title }}</span>

    <div class="flex items-center gap-4">
      <span v-if="user" class="text-sm text-slate-500">
        Logged in as
        <strong class="text-slate-700">{{ user.name }}</strong>
        <span v-if="user.email"> ({{ user.email }})</span>
      </span>
      <button
        type="button"
        class="text-sm px-3 py-1.5 rounded border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white transition"
        @click="emit('logout')"
      >
        Logout
      </button>
    </div>
  </header>
</template>
