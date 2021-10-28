# 指南 || 10

Web Widget 是一个基于现代 Web 的构建的开放式网页小挂件系统，它和传统的组件系统不一样的地方在于，它可以提供立即运行的服务。

```html
<web-widget src="app.widget.js"></web-widget>
```

了解[设计 Web Widget 的动机](../discover/about.md)。

## 应用场景

**1. 可视化编辑器中的物料系统**

将 Web Widget 技术体系作为落地页的物料系统方案，使得物料开发者不需要关心编辑器的 API 即可提供内容。

**2. Web 应用插件系统**

对 Web Widget 进行扩展，注入插件所需要的的 API，提供良好的插件开发体验同时管理插件的副作用。

**3. 个性化卡片信息流展示**

例如 [Google OneBox](https://en.ryte.com/wiki/Google_OneBox) 与[百度框计算](https://baike.baidu.com/item/%E6%A1%86%E8%AE%A1%E7%AE%97/9541258)，让你在输入“天气”的时候，它能够直接在搜索结果中展示可互动卡片信息，而 Web Widget 应用符合动态分发的关键要素。

**4. 单页应用微前端工程架构**

基于 Web Widget 的容器，在 Web 工程中实施当今流行的微前端架构，屏蔽技术栈变更带来的不稳定因素，保证软件具备长远的生命力。

## 学习

* [开发入门](./developing/getting-started.md)：了解如何开发 Web Widget 应用
* [架构入门](./architecture/getting-started.md)：了解如何在 Web 工程中引入 Web Widget