/* eslint-disable import/no-unresolved */
export default () => {
  let main, Vue, VueRouter, app, appRoot;
  console.log('Vue load');
  return {
    async bootstrap() {
      console.log('Vue router bootstrap');

      main = document.createElement('main');
      main.innerHTML = `
        <h3>Vue router</h3>
      `;

      // bootstrap vue app
      await import('https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js');
      await import(
        'https://cdn.jsdelivr.net/npm/vue-router@3.5.2/dist/vue-router.js'
      );
      Vue = window.Vue;
      VueRouter = window.VueRouter;
    },
    async mount({ container, route }) {
      console.log('Vue router mount', route);
      container.appendChild(main);

      // mount vue app
      Vue.use(VueRouter);
      const Foo = { template: '<div>foo{{Date.now()}}</div>' };
      const Bar = { template: '<div>bar</div>' };
      const routes = [
        { path: '/vue-router/foo', component: Foo },
        { path: '/vue-router/bar/:id', component: Bar }
      ];

      const router = new VueRouter({
        mode: 'history',
        routes
      });

      app = new Vue({
        router
      });
      console.log(app);

      appRoot = document.createElement('div');
      appRoot.innerHTML = `
        <div id="app">
          <h1>Hello App!</h1>
          <p>
            <a is="web-link" href="/">Go to Home</a>
            <router-link to="/vue-router/foo">Go to Foo</router-link>
            <router-link to="/vue-router/bar/34355">Go to Bar</router-link>
          </p>
          <router-view></router-view>
        </div>
      `;
      container.appendChild(appRoot);
      app.$mount(appRoot);
    },
    async unmount({ container }) {
      console.log('Vue router unmount');
      container.removeChild(main);

      // unmount vue app
      app.$destroy();
      app.$el.parentNode.removeChild(app.$el);
      app = null;
      appRoot = null;
    }
  };
};
