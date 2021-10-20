# WebWidget system loader

这是 WebWidget 的 system 格式插件。

## 安装

```bash
npm install @web-sandbox.js/system-loader --save
```

## 使用

```html
<web-widget type="system" src="app.widget.js"></web-widget>
```

```js
import 'systemjs/s.js';
import '@web-sandbox.js/web-widget';
import '@web-sandbox.js/system-loader';
```

## 运行示例

```bash
npm run examples
```