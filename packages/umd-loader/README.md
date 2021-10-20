# WebWidget umd loader

这是 WebWidget 的 umd 格式插件。

## 安装

```bash
npm install @web-sandbox.js/umd-loader --save
```

## 使用

指定 `type="umd"` 与 `name`，`name` 的值为模块导出的全局变量名。

```html
<web-widget type="umd" name="umdModuleName" src="app.widget.js"></web-widget>
```

```js
import '@web-sandbox.js/web-widget';
import '@web-sandbox.js/umd-loader';
```

## 运行示例

```bash
npm run examples
```