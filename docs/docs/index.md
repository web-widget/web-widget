---
eleventyNavigation:
  key: 文档
  order: 20
---

# 文档

我们的文档是手工制作和优化的，可用做手册，以便在需要时查找详细信息。

如需更多指导性学习体验，请访问我们的[指南](../guides/index.md)。

## 概念

Web Widget 技术体系由如下三个关键部分组成：

### 容器

Web Widget 容器是一个 HTML 标签，它用来运行应用。

```html
<web-widget src="app.widget.js"></web-widget>
```

详情见[容器文档](./container/overview.md)。

### 应用

Web Widget 应用即 `<web-widget src="app.widget.js">` 中 `src` 定义的小挂件入口文件，你可以使用任何前端技术来开发它，例如 Lit、React、Vue 等。它的格式：

```js
// app.widget.js
export default () => ({
  async bootstrap: (props) => {},
  async mount: (props) => {},
  async unmount: (props) => {},
  async unload: (props) => {}
});
```

详情见[应用文档](./application/overview.md)。

### 清单

Web Widget 定义了应用的描述规范，它使用 NPM package.json 描述了应用名字、图标等信息，以便能够支持不同的应用市场展示。例如：

```json
{
  "name": "app",
  "version": "0.0.1",
  "main": "dist/umd/index.widget.js",
  "……": "……"
}
```

详情见[清单文档](./manifest/overview.md)。