/* eslint-disable import/no-unresolved */

let main, nav, Vue, VueRouter, app;
console.log('Vue load');
export default {
  async bootstrap({ container }) {
    console.log('Vue router bootstrap');

    await import('https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js');
    await import(
      'https://cdn.jsdelivr.net/npm/vue-router@3.5.2/dist/vue-router.js'
    );
    Vue = window.Vue;
    VueRouter = window.VueRouter;
    delete window.Vue;
    delete window.VueRouter;

    main = document.createElement('main');
    main.innerHTML = `
        <h3>Vue router</h3>
        <div id="app">
          <h1>Hello App!</h1>
          <p>
            <router-link to="/vue-router/foo">Go to Foo</router-link>
            <router-link to="/vue-router/bar">Go to Bar</router-link>
          </p>
          <router-view></router-view>
        </div>
      `;

    nav = document.createElement('web-widget');
    nav.src = '/nav.widget.js';
    nav.inactive = true;
    container.appendChild(nav);

    return nav.bootstrap();
  },
  async mount({ container }) {
    console.log('Vue router mount');
    await nav.mount();
    container.appendChild(main);

    if (!app) {
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
    }

    app.$mount(container.querySelector('#app'));
  },
  async unmount({ container }) {
    console.log('Vue router unmount');
    await nav.unmount();

    app.$destroy('#app');

    container.removeChild(main);
  }
};
