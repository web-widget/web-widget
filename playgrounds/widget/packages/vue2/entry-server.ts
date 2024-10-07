import Vue from 'vue';
import { createRenderer } from 'vue-server-renderer';
import App from './App.vue';

export async function render() {
  const app = new Vue({
    render: (h) => h(App),
  });
  const renderer = createRenderer();
  const ctx = {};
  const html = await renderer.renderToString(app, ctx);

  return { html };
}
