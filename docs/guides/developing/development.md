# 应用开发 >> 开发 || 20

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

浏览器在过去几年中得到了很大改进，现在可以使用浏览器的原生模块进行 Web Widget 应用开发，而无需复杂的构建工具。

## 项目生成器

Web Widget CLI 是一个项目生成器，它为如下技术栈提供了可开箱即用的模板代码：

* Lit
* Vue2 / Vue3
* React
* Vanilla

请执行如下命令启动它：

```bash
npm init @web-widget
```

## 运行服务器

生成器使用 [Vite](https://vitejs.dev) 作为开发工具。要在项目中运行服务器，请执行以下命令：

```bash
npm run dev
```

当你编辑代码后，浏览器将自动重新加载。

## 框架适配

将不同的前端框架的组件包装成 Web Widget [应用格式](../../docs/application/overview.md)。

### React

```js
import { App } from './App.tsx';
import ReactDOM from 'react-dom';

export default () => {
  let vdom;
  return {
    async mount({ container, data }) {			
      if (ReactDOM.createRoot) {
        vdom = ReactDOM.createRoot(container);
        vdom.render(<App />);
      } else {
        // React < 18
        ReactDOM.render(<App />, container);
      }
    },

    async unmount() {
      if (vdom && vdom.unmount) {
        vdom.unmount();
      } else {
        // React < 18
        ReactDOM.unmountComponentAtNode(container);
      }
      vdom = null;
    },
  };
};
```

### Vue3

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

### Vue2

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

<inline-notification type="tip">

后续将会提供框架适配器简化上述样板代码的工作。

</inline-notification>

## 裸模块导入

javascript 项目中的常见做法是使用所谓的“裸模块导入”。这些是 `imports` 语句，它仅指定包的名称或包内的文件。

例如：

```js
import foo from 'foo';
```

当 `node_modules` 文件夹中的依赖项需要引用其他包时，此类导入很有用。不幸的是，今天的浏览器不理解这种导入方式，需要某种形式的预处理来解析导入以引用实际文件位置。幸运的是 [Vite](https://vitejs.dev) 已经自动帮我们处理了这个问题。

将来，像 [import maps](https://github.com/WICG/import-maps) 这样的标准将允许浏览器理解这些类型的导入，而无需转换步骤。对于目前，我们有一个可以过渡到标准的方案，你可以通过[发布](./publishing.md)文档了解到如何处理浏览器兼容问题。