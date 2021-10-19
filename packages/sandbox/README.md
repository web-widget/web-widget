# WebWidget sandbox

这是 WebWidget 的沙盒特性功能。

## 安装

```bash
npm install @web-sandbox.js/sandbox --save
```

## 使用

```html
<web-widget type="umd" name="myWidget" sandbox src="app.widget.js"></web-widget>
```

```js
import '@web-sandbox.js/web-widget';
import '@web-sandbox.js/umd-loader';
import '@web-sandbox.js/sandbox';
```