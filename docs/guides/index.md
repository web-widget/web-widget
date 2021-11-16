# 指南 || 10

Web Widget 是一个基于现代 Web 的构建的开放式网页小挂件系统，它也是一种属于前端的容器化架构。

```html
<web-widget src="app.widget.js"></web-widget>
```

了解[设计 Web Widget 的动机](../discover/about.md)。

## 应用场景

### 可视化编辑器中的物料系统

将 Web Widget 技术体系作为落地页的物料系统方案，使得物料开发者不需要关心编辑器的 API 即可提供内容。

### Web 应用插件容器

对 Web Widget 进行扩展，注入插件所需要的的 API，提供良好的插件开发体验同时管理插件的副作用。

### 个性化卡片信息流展示

例如 [Google OneBox](https://en.ryte.com/wiki/Google_OneBox) 与[百度框计算](https://baike.baidu.com/item/%E6%A1%86%E8%AE%A1%E7%AE%97/9541258)，它们可以让你在输入“天气”的时候直接在搜索结果中呈现可互动的天气卡片，而 Web Widget 应用具备这样动态分发要求的关键要素。

### 单页应用微前端工程架构

基于 Web Widget 技术体系，将前端页面容器化，以便在 Web 工程中实施当今流行的微前端架构，从而屏蔽技术栈变更带来的不稳定因素、确保软件具备长久的生命。

## 理解 Web Widget

Web Widget 由如下三个关键部分组成：

### 应用

Web Widget 应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的小挂件入口文件，它和具体技术栈、容器无关，你可以使用任意技术栈开发它，例如 Lit、React、Vue 等。它的格式范式：

```js
// app.widget.js
export default () => ({
  async bootstrap(props) {},
  async mount(props) {},
  async update(props) {},
  async unmount(props) {},
  async unload(props) {}
});
```

详情见[应用文档](../docs/application/overview.md)。

### 容器

Web Widget 容器是一个 HTML 标签，它用来运行应用。

```html
<web-widget src="app.widget.js"></web-widget>
```

详情见[容器文档](../docs/container/overview.md)。

### 清单

Web Widget 定义了应用的描述规范，它通常用于后端的管理系统获取信息用，和应用与容器没有直接关系。它使用 NPM package.json 描述了应用名字、图标等信息，以便能够支持不同的应用市场展示。例如：

```json
{
  "name": "app",
  "version": "0.0.1",
  "main": "dist/umd/index.widget.js",
  "……": "……"
}
```

详情见[清单文档](../docs/manifest/overview.md)。

## 我应该采用 Web Widget 吗？

Web Widget 是建立在前端微服务的工具，当你权衡是否要采用 Web Widget 之前，你需要理解组件和微服务的差别：组件的用户是开发者，通过开发者构建应用，最终为客户服务；而前端微服务可以直接为客户提供服务。

例如一个单页面可以被称为一个微服务，够独立工作的组件（例如地图小挂件）也能够被定义为一个微服务，但一个按钮通常不会被纳入微服务的概念。

当然，上述表达方式依然不够清晰，因为服务并不是一个在代码上的概念，而是解决问题的手段。如果你遇到概念上的困惑，没关系，建议你先聚焦到你要解决的问题上。

如果我们发现构建的服务确实需要与外部交互才能解决具体业务问题，你可以先尝试改进现有的代码：

* 将需要频繁交互的代码使用 NPM 管理，并且 `import` 到服务里，在内部解决耦合问题
* 将多个需要配合才能运行的服务合并成一个单一服务

如果依然无法解决问题，决定放弃服务化也是正确的选择，而不是试图为 Web Widget 的应用注入额外的事件、接口，这样会破坏服务的好处，只会放大缺点。

## 渐进式的学习

* [应用开发入门](./developing/getting-started.md)：了解如何开发 Web Widget 应用
* [容器化入门](./architecture/getting-started.md)：了解如何在 Web 工程中实施容器化

> Web Widget 还在筹备开源中，如果你有兴趣参与，请联系我：[tangbing@gaoding.com](mailto:tangbing@gaoding.com)