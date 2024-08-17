import { createVueRender } from '@web-widget/vue2';
import type { ClientWidgetRenderContext } from '@web-widget/helpers';
import type { RawLocation } from 'vue-router';
import App from './App.vue';
import createRouter from './router';

type Props = {
  route?: RawLocation;
} & any;

export const render = createVueRender({
  async onBeforeCreateApp(context, _component: any, props: any) {
    const container = (context as ClientWidgetRenderContext).container;

    const router = createRouter(container);
    return {
      router,
    };
  },
  async onCreatedApp(app, context) {
    if (import.meta.env.SSR) {
      const data = context.data as Props;
      const route = data.route;

      if (!route) {
        throw new TypeError(`"route" must be provided to work on the server.`);
      }

      delete data.route;
      // @ts-ignore
      app.$router.push(route);
    }

    return new Promise((resolve, reject) => {
      // @ts-ignore
      app.$router.onReady(resolve, reject);
    });
  },
});

export default App;
