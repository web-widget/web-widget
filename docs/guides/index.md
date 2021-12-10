# 指南 || 10

Web Widget 是一个 Web 前端的应用容器，它允许你将用户界面相关的逻辑以统一的方式封装起来，变成立即可用的服务。

```html
<web-widget src="app.widget.js"></web-widget>
```

运行时文件仅 4KB（gzip）。

* 原生支持 ES module、导入映射、Web components
* 通过 system 插件实现 ES module 浏览器兼容
* 支持运行 React、Vue、Lit 等组件
* 能够工作在 React、Vue、Lit 等组件内部
* 支持与可视化编辑器集成，编辑数据、主题、插槽
* 能够与 Webpack 或 Vite 一起工作
* 支持懒加载、预加载等工程优化手段
* 支持在浏览器中自动更新、版本管理
* 容器支持扩展新特性，以便与其他程序集成
* 支持路由驱动
* 支持安全运行第三方代码

了解我们做这些事情的背后动机：[设计 Web Widget 的动机](../discover/about.md)。

## 概念

### 应用

Web Widget 应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的小挂件入口文件，它和具体技术栈、容器无关，你可以使用任意技术栈开发它，例如 Lit、React、Vue 等。它的格式范式：

```js
// app.widget.js
export default (props) => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {}
});
```

### 容器

Web Widget 容器是一个 HTML 标签，它用来运行应用。

```html
<web-widget src="app.widget.js"></web-widget>
```

容器具备多种性能、安全措施，以及可扩展性，它能够对应用进行统一优化。

## 指南

* [应用开发指南](./developing/getting-started.md)：了解如何开发 Web Widget 应用
* [容器化指南](./architecture/getting-started.md)：了解如何在 Web 工程中部署前端容器化架构

> Web Widget 还在高速发展阶段，尚未达到我们心目中的开源项目标准，如果你想知晓规划细节请联系我：[tangbing@gaoding.com](mailto:tangbing@gaoding.com)