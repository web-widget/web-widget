# 开发 >> Vue 适配 || 70

## Vue3

```js
import { createApp } from 'vue';
import App from './App.vue';

export default () => {
  let appWrap;
  let app;

  return {
    async mount({ container }) {
      appWrap = document.createElement('div');
      container.appendChild(appWrap);

      app = createApp(App);
      app.mount(appWrap);
    },
    async unmount({ container }) {
      app.unmount();
      container.innerHTML = '';
      appWrap = app = null;
    }
  };
};
```

## Vue2

```js
import Vue from 'vue';
import App from './App.vue';

export default () => {
  let appWrap;
  let app;

  return {
    async mount({ container }) {
      appWrap = document.createElement('div');
      container.appendChild(appWrap);

      app = new Vue({
        el: appWrap,
        render(h) {
          return h(App);
        }
      });
    },
    async unmount({ container }) {
      app.$destroy();
      container.innerHTML = '';
      appWrap = app = null;
    }
  };
};
```