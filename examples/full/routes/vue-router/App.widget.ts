import { defineVueRender } from "@web-widget/vue";
import App from "./App.vue";
import createRouter from "./router";
import type { ClientWidgetRenderContext } from "@web-widget/schema";
import type { RouteLocationRaw } from "vue-router";

type ServerRoute = {
  route?: RouteLocationRaw;
} & any;

export const render = defineVueRender({
  async onCreatedApp(app, context) {
    const container = (context as ClientWidgetRenderContext).container;
    const router = createRouter(container);

    app.use(router);

    if (import.meta.env.SSR) {
      const data = context.data as ServerRoute;
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
