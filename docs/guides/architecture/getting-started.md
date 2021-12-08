# 容器化 >> 入门

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

不同于传统的组件系统，Web Widget 的应用是建立在明确范式上的，因此我们有机会通过部署统一的前端容器化架构去管理、优化它们，更容易的构建符合最佳的用户体验的产品。

子目录的内容都是独立的，你无需按照顺序学习。

## 决策

### 微服务不是目的，而是解决问题的手段

当你权衡是否要采用 Web Widget 之前，你需要理解组件和微服务的差别：组件的用户是开发者，通过开发者构建应用，最终为客户服务；而前端微服务可以直接为客户提供服务。

例如一个单页面可以被称为一个微服务，够独立工作的组件（例如地图小挂件）也能够被定义为一个微服务，但一个按钮通常不会被纳入微服务的概念。

对于前端开发者，我们大部分的组件是高度耦合的，我们习惯了这种编程思维，这却很容易带来错误的技术决策：当你将需要频繁交互的组件进行容器化的时候，你会发现容器化的架构会带来诸多不便，它不能像组件一样随时调用 API、通信等。事实上，这些有意为之，容器化的目的就是为了管理副作用，使得我们能够达成传统手段难以达成的业务目标，并且这些目标可能是非常令人激动的。

如果在实施中遇到确实需要耦合的地方，不妨使用如下方式改进代码：

* 将需要频繁交互的组件使用 NPM 管理，并且 `import` 到服务里，这样内部可以随意的进行通信、接口调用。例如获取用户认证信息的模块可以这样抽离
* 将多个需要配合才能运行的服务合并成一个单一服务

如果依然无法解决问题，决定放弃服务化也是正确的选择，而不是试图为 Web Widget 的应用注入额外的事件、接口，这样会破坏服务的好处，只会放大缺点。

<inline-notification type="tip">

Web Widget 几乎所有的文档中使用“应用”代替了“微服务”的概念，这仅仅是名字上的不同而已，本质是微服务的具体实现。

</inline-notification>

### 适合的场景

### 可视化编辑器中的物料系统

将 Web Widget 技术体系作为落地页的物料系统方案，使得物料开发者不需要关心编辑器的 API 即可提供内容。

### Web 应用插件系统

对 Web Widget 进行扩展，注入插件所需要的的 API，提供良好的插件开发体验同时管理插件的副作用。

### 个性化卡片信息流展示

例如 [Google OneBox](https://en.ryte.com/wiki/Google_OneBox) 与[百度框计算](https://baike.baidu.com/item/%E6%A1%86%E8%AE%A1%E7%AE%97/9541258)，它们可以让你在输入“天气”的时候直接在搜索结果中呈现可互动的天气卡片，而 Web Widget 应用具备这样动态分发要求的关键要素。

### 单页应用微前端工程架构

基于 Web Widget 技术体系，将前端页面容器化，以便在 Web 工程中实施当今流行的微前端架构，从而屏蔽技术栈变更带来的不稳定因素、确保软件具备长久的生命。

## 安装

通过 NPM 安装到你的工程中：

```bash
npm install --save @web-widget/container
```

在页面中引入应用容器的运行时文件：

```js
import '@web-widget/container';
```

引入运行时文件后，`<web-widget>` 元素就可以工作了：

```html
<web-widget src="./app.widget.js"></web-widget>
```

## 处理状态

`<web-widget>` 是一个标准的自定义元素，只有 `@web-widget/container` 载入完成后它才能开始工作。当你通过异步的方式引入 `@web-widget/container` 后，你可以通过浏览器提供的 CSS [`:defined`](https://developer.mozilla.org/en-US/docs/Web/CSS/:defined) 伪类 与 DOM [`customElements.whenDefined()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined) 接口来得知 `<web-widget>` 是否已经注册完毕。

```html
<style>
  web-widget:not(:defined) {
    /* not defined */
  }
  web-widget:defined {
    /* defined */
  }
</style>

<script type="module">
  console.log('not defined');
  customElements.whenDefined('web-widget').then(() => {
    console.log('defined');
  });
</script>
```