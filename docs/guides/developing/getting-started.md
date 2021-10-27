# 开发 >> 入门 ||10

Web Widget 是一个非常简单的技术，所有的一切都是建立在 Web 标准以及你所熟悉的工具链上。

## 开发第一个小挂件

### 1. 部署容器

在网页 `<body>` 中添加一个 `<web-widget>` 标签，它是小挂件的运行容器:

```html
<web-widget src="./app.widget.js"></web-widget>
```

然后，在网页底部引入 Web Widget 的运行时，以便 `<web-widget>` 标签能够成为浏览器的一部分：

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@web-widget/core/dist/esm/core.js';
<script>
```

### 2. 开发小挂件

我们创建相应的 app.widget.js 文件，它是小挂件的应用格式：

```js
export default () => ({
  async mount: ({ container }) => {
    container.innerHTML = '<h3><hello wrold/h3>';
  }
});
```

恭喜你，你已经完成了 Web Widget 架构最关键的部分。如果你通过服务器浏览网页，你会发现它已经开始工作了！

## 安装

除了使用 CDN 来安装 Web Widget 运行时之外，常见做法是通过 NPM 安装到你的工程中。

```bash
npm install --save @web-widget/core
```