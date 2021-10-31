# WebWidget umd loader

这是 WebWidget 的 umd 格式插件。

[文档](https://web-widget.js.org/docs/container/plugins/umd-loader/)

## 安装

```bash
npm install @web-widget/umd-loader --save
```

## 使用

指定 `type="umd"` 与 `name`，`name` 的值为模块导出的全局变量名。

```html
<web-widget type="umd" name="umdModuleName" src="app.widget.js"></web-widget>
```

```js
import '@web-widget/container';
import '@web-widget/umd-loader';
```

## 运行示例

```bash
npm run examples
```