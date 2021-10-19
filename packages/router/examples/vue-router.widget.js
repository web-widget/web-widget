/* eslint-disable import/no-unresolved */
export default () => {
  let main, nav, Vue, VueRouter, app, appRoot;
  console.log('Vue load');
  return {
    async bootstrap({ container }) {
      console.log('Vue router bootstrap');

      nav = document.createElement('web-widget');
      nav.src = '/nav.widget.js';
      nav.inactive = true;
      container.appendChild(nav);
      main = document.createElement('main');
      main.innerHTML = `
        <h3>Vue router</h3>
      `;

      await nav.bootstrap();

      // bootstrap vue app
      await import('https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js');
      await import(
        'https://cdn.jsdelivr.net/npm/vue-router@3.5.2/dist/vue-router.js'
      );
      Vue = window.Vue;
      VueRouter = window.VueRouter;
      delete window.Vue;
      delete window.VueRouter;
    },
    async mount({ container }) {
      console.log('Vue router mount');
      await nav.mount();
      container.appendChild(main);

      // mount vue app
      Vue.use(VueRouter);
      const Foo = { template: '<div>foo</div>' };
      const Bar = { template: '<div>bar</div>' };
      const routes = [
        { path: '/vue-router/foo', component: Foo },
        { path: '/vue-router/bar', component: Bar }
      ];

      const router = new VueRouter({
        mode: 'history',
        routes
      });

      app = new Vue({
        router
      });

      appRoot = document.createElement('div');
      appRoot.innerHTML = `
        <div id="app">
          <h1>Hello App!</h1>
          <p>
            <router-link to="/vue-router/foo">Go to Foo</router-link>
            <router-link to="/vue-router/bar">Go to Bar</router-link>
          </p>
          <router-view></router-view>
        </div>
      `;
      container.appendChild(appRoot);
      app.$mount(appRoot);
    },
    async unmount({ container }) {
      console.log('Vue router unmount');
      await nav.unmount();
      container.removeChild(main);

      // unmount vue app
      app.$destroy();
      app.$el.parentNode.removeChild(app.$el);
      app = null;
      appRoot = null;
    }
  };
};
