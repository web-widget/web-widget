# WebWidget system loader

这是 WebWidget 的 system 格式插件。

## 安装

```bash
npm install @web-widget/system-loader --save
```

## 使用

```html
<web-widget type="system" src="app.widget.js"></web-widget>
```

```js
import 'systemjs/s.js';
import '@web-widget/core';
import '@web-widget/system-loader';
```

## 运行示例

```bash
npm run examples
```