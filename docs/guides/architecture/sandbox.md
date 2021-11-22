# 容器化 >> 运行第三方代码 || 50

Web Widget 容器提供了一个虚拟化的浏览器内部环境以及内置的安全策略来实现第三方代码的安全运行，它的原理：

* JS 语言安全——Realm: 基于 TC39 草案实现
* CSS 安全——Shadow DOM: Web 正式标准
* HTML 安全——Sanitizer: 基于 W3C 草案实现
* 内容安全策略——CSP: 基于 W3C 正式标准实现
* 陷阱——Proxy：基于 EcmaScript 语言的 Proxy 实现

## 安装

```bash
npm install --save @web-widget/container
npm install --save @web-widget/umd-loader
npm install --save @web-widget/sandbox
```

## 使用

开启 `sandboxed` 功能，并且设置[内容安全策略](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)。

```html
<web-widget
  src="./app.widget.js"
  type="umd"
  sandboxed
  csp="
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net web-sandbox.js.org;
    style-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    navigate-to 'self' web-sandbox.js.org;
  ">
</web-widget>

<script type="module">
  import '@web-widget/container';
  import '@web-widget/umd-loader';
  import '@web-widget/sandbox';
</script>
```

更多请阅读 [Sandbox 插件文档](../../docs/container/plugins/sandbox.md)。