import { defineVueRender } from "@web-widget/vue";
import App from "./App.vue";
import createRouter from "./router";

export const render = defineVueRender({
  async onCreatedApp(app, context) {
    const router = createRouter();
    app.use(router);
    const route = (context.data as any)?.startUrl as string;
    await router.push(route);
    await router.isReady();
  },
});

export default App;
