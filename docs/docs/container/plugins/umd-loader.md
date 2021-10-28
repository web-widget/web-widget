# 容器 >> 插件 >> Umd-loader || 5

这是 WebWidget 的 UMD 格式插件。

## 安装

```bash
npm install @web-widget/umd-loader --save
```

## 使用

指定 `type="umd"` 与 `name`。`name` 的值为模块导出的全局变量名，如果没有指定的话，加载器会去猜测。

```html
<web-widget type="umd" name="umdModuleName" src="app.widget.js"></web-widget>
```

```js
import '@web-widget/core';
import '@web-widget/umd-loader';
```