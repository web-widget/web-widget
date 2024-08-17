import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default function createRouter(
  scrollingElement?: Element | DocumentFragment
) {
  return new Router({
    mode: 'history',
    routes: [
      {
        path: '/vue2-router',
        name: 'home',
        component: () => import('../views/HomeView.vue'),
      },
      {
        path: '/vue2-router/about',
        name: 'about',
        component: () => import('../views/AboutView.vue'),
      },
    ],
    scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) {
        return savedPosition;
      } else {
        return { x: 0, y: 0 /*el: scrollingElement*/ };
      }
    },
  });
}
