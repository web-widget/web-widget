# 容器化 >> 模块格式 || 20

Web Widget 容器默认支持的 JavaScript 模块格式为 ES module：

```html
<web-widget src="app.widget.js"></web-widget>
```

你可以通过加载器插件来使用其他的模块系统，例如 `type="system"`：

```html
<web-widget type="system" src="app.widget.js"></web-widget>

<script type="module">
import 'systemjs/s.js';
import '@web-widget/container';
import '@web-widget/system-loader';
</script>
```

目前我们提供了两个常用格式的加载器插件：

* [system-loader](../../docs/container/plugins/system-loader.md)
* [umd-loader](../../docs/container/plugins/umd-loader.md)

如果已有的加载器插件依然无法满足你的要求，建议你[编写插件](../../docs/container/writing-plugins.md)。