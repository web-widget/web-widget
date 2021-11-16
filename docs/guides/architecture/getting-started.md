# 容器化 >> 入门

不同于传统的组件系统，Web Widget 的应用是建立在明确范式上的，因此我们有机会通过部署统一的前端容器化架构去管理、优化它们，更容易的构建符合最佳的用户体验的产品。

此目录的内容都是独立的，你无需按照顺序学习。

## 安装

通过 NPM 安装到你的工程中：

```bash
npm install --save @web-widget/container
```

在页面中引入应用容器的运行时文件：

```js
import '@web-widget/container';
```

```html
<web-widget src="./app.widget.js"></web-widget>
```