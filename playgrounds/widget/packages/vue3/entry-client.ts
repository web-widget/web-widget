import './style.css';
import { createSSRApp, createApp } from 'vue';
import App from './App.vue';

const app = import.meta.env.VITE_HYDRATE_MODE
  ? createSSRApp(App)
  : createApp(App);

app.mount('#app');
