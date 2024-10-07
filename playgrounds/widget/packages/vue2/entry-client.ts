import './style.css';
import Vue from 'vue';
import App from './App.vue';

const app = new Vue({
  render: (h) => h(App),
});

const element = document.getElementById('app')!;
if (import.meta.env.VITE_HYDRATE_MODE) {
  app.$mount(element, true);
} else {
  element.appendChild(app.$mount().$el);
}
