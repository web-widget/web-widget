# 应用容器 >> 插件 >> Umd-loader || 5

这是 Web Widget 的 `umd` 格式插件。

## 安装

```bash
npm install --save @web-widget/container
npm install --save @web-widget/umd-loader
```

## 使用

```html
<web-widget type="umd" src="app.widget.js"></web-widget>
```

```js
import '@web-widget/container';
import '@web-widget/umd-loader';
```

默认情况下，加载器会使用应用添加到 window 上的最后一个成员当作导出的模块，当不符合预期的时候，你也可以通过设置 `library` 属性指定使用 `umd` 导出的全局变量。

```html
<web-widget type="umd" library="AppWidget" src="app.widget.js"></web-widget>
```
