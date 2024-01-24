import { createVueRender } from "@web-widget/vue";
import type { ClientWidgetRenderContext } from "@web-widget/helpers";
import type { RouteLocationRaw } from "vue-router";
import App from "./App.vue";
import createRouter from "./router";

type Props = {
  route?: RouteLocationRaw;
} & any;

export const render = createVueRender({
  async onCreatedApp(app, context) {
    const container = (context as ClientWidgetRenderContext).container;
    const router = createRouter(container);

    app.use(router);

    if (import.meta.env.SSR) {
      const data = context.data as Props;
      const route = data.route;

      if (!route) {
        throw new TypeError(`"route" must be provided to work on the server.`);
      }

      delete data.route;
      await router.push(route);
    }

    await router.isReady();
  },
});

export default App;
