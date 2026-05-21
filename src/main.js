import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/css/tailwind.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Hydrate auth from localStorage before first navigation
useAuthStore().hydrate();

app.mount('#app');
