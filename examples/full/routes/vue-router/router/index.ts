import {
  createRouter as router,
  createWebHistory,
  createMemoryHistory,
} from "vue-router";

export default function createRouter(
  scrollingElement?: Element | DocumentFragment
) {
  return router({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes: [
      {
        path: "/vue-router",
        name: "home",
        component: () => import("../views/HomeView.vue"),
      },
      {
        path: "/vue-router/about",
        name: "about",
        component: () => import("../views/AboutView.vue"),
      },
    ],
    scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) {
        return savedPosition;
      } else {
        return { top: 0 /*el: scrollingElement*/ };
      }
    },
  });
}
