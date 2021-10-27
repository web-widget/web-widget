# 架构 >> 运行第三方代码 || 30

开启 `sandboxed` 功能，并且设置内容安全策略。

## 安装

```bash
npm install @web-widget/sandbox --save
```

## 使用

```html
<web-widget
  src="./app.widget.js"
  sandboxed
  csp="
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net web-sandbox.js.org;
    style-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    navigate-to 'self' web-sandbox.js.org;
  ">
</web-widget>
```

如果父节点的 Web Widget 启用了 `sandboxed` 属性，子节点（包括 ShadowRoot）中的 Web Widget 也将继承沙盒的权限。

```html
<web-widget
  src="./app.widget.js"
  sandboxed
  csp="
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net web-sandbox.js.org;
    style-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    navigate-to 'self' web-sandbox.js.org;
  ">
    #shadow-root (closed)
      <web-widget src="./a.widget.js"></web-widget>
    <web-widget src="./b.widget.js"></web-widget>
</web-widget>
```

更多请阅读 [Sandbox 插件文档](../../docs/container/plugins/sandbox.md)。