# We bWidget umd loader

这是 Web Widget 的 `umd` 格式插件。

[文档](https://web-widget.js.org/docs/container/plugins/umd-loader/)

## 安装

```bash
npm install @web-widget/umd-loader --save
```

## 使用

```html
<web-widget type="umd" src="app.widget.js"></web-widget>
```

```js
import '@web-widget/container';
import '@web-widget/umd-loader';
```

默认情况下，加载器会使用应用添加到 window 上的最后一个成员当作导出的模块，你也可以通过设置 `library` 属性指定明确的名称。

```html
<web-widget type="umd" library="AppWidget" src="app.widget.js"></web-widget>
```

## 运行示例

```bash
npm run examples
```