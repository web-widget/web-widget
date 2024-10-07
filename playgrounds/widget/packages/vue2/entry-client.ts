import './style.css';
import Vue from 'vue';
import App from './App.vue';

const app = new Vue({
  render: (h) => h(App),
});

const element = document.getElementById('app')!;
if (import.meta.env.VITE_HYDRATE_MODE) {
  const vue2ssrAttrSelector = `[data-server-rendered="true"]`;
  const ssrRoot =
    element.querySelector(vue2ssrAttrSelector) || element.firstElementChild;
  app.$mount(ssrRoot!, true);
} else {
  element.appendChild(app.$mount().$el);
}
