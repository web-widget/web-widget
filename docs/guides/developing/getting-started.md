# 应用开发 >> 入门 || 10

Web Widget 的应用非常简单，2 分钟即可上手，让我们一起开发第一个小挂件：

### 1. 部署容器

首先，在网页 `<body>` 中添加一个 `<web-widget>` 标签，它是小挂件的运行容器:

```html
<web-widget src="./app.widget.js"></web-widget>
```

然后，在网页底部引入 Web Widget 应用容器的运行时，以便 `<web-widget>` 标签能够成为浏览器的一部分：

```html
<script type="module" src="https://unpkg.com/@web-widget/container/dist/esm/web-widget.js"></script>
```

### 2. 开发小挂件

创建相应的 app.widget.js 文件，它是小挂件的[应用格式](../../docs/application/overview.md)：

```js
export default () => ({
  async mount({ container }) {
    container.innerHTML = `
      <style>h3 { color: red }</style>
      <h3>hello wrold</h3>
    `;
  }
});
```

恭喜你，你已经完成了第一个 Web Widget 应用的开发。如果你通过服务器浏览网页，你会发现它已经开始工作了！

接下来，我们将学习开发一个符合生产要求的 Web Widget 应用：[下一步](./development.md)。