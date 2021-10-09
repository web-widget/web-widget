- 开始日期：2021-10-09
- 作者：糖饼
- 类型：技术

# 目标

* 解决使用 Webpack 的 externals 构建出的 UMD 模块无法运行的问题 [#24](https://github.com/web-sandbox-js/web-widget/issues/24)
* 保持向后兼容，例如使用 [ShadowRealm](https://tc39.es/proposal-shadowrealm/) 实现沙箱

# 动机

WebWidget 目前默认的模块格式是 UMD，要完整的实现它的依赖管理是一个比较复杂的事情，而这些工作并不是 WebWidget 容器的核心目标，因此现在 WebWidget 容器只实现了 commonjs 一个子集，因此应用一旦存在 `require()` 语句将会导致执行出错，导致类似的问题 [#24](https://github.com/web-sandbox-js/web-widget/issues/24) 发生。

WebSandbox 的沙箱实现采用了 TC39 Realms 第二阶段规范实现的，它本质上是一个特殊的 `eval()` 语句，无法使用 ES module，因此 WebWidget 容器基于照顾沙盒的实现考虑不得不使用了 UMD 模块格式。在几个月前，Realms 走向了第三阶段，它的 API 发生了重大的变更（也更名为 ShadowRealm），它的 API 更像是一个特殊的 `import()`，完全针对 ES module 而设计，这使得我们必须考虑后续兼容性的问题。[ShadowRealm API 示范](https://github.com/leobalter/realms-polyfill/blob/main/README.md)

上述两个问题都指向同一个问题：我们需要重新考虑 WebWidget 容器的默认模块类型。

# 产出

- 与标准对齐，让 WebWidget 的解决方案拥有更长的生命力
- 能够和各种构建工具配合使用，避免干扰它们，例如 Webpack 与 Vite 等
- 开发者可以通过加载器勾子函数完实现对第三方模块的加载，例如 System 等

# 提议内容

* 使用 ES module 作为 WebWidget 容器的默认模块格式，`type` 属性默认值变更为 `"module"`
* 删除 UMD 格式的内置支持
* WebWidget 容器增加 `createLoader()` 钩子函数

## 指引和例子

### 使用 ES module 模块

```html
<web-widget src="app.widget.js"></web-widget>
<script type="module">
  import '@web-sandbox.js/web-widget';
</script>
```

如果不指定 `type` 的属性的情况下，它将 app.widget.js 作为 ES module 处理。

###  使用 system 模块

```html
<web-widget src="app.widget.js" type="system"></web-widget>
<script type="module">
  import '@web-sandbox.js/web-widget';
  import 'systemjs';

  const createLoader = HTMLWebWidgetElement.prototype.createLoader;
  HTMLWebWidgetElement.prototype.createLoader = function() {
    const { src, text, type } = this;

    if (type !== 'system') {
      return createLoader.apply(this, arguments);
    }

    if (src) {
      return System.import(src);
    }

    src = URL.createObjectURL(
      new Blob([text], { type: 'application/javascript' })
    );

    return System.import(src).then(
      module => {
        URL.revokeObjectURL(src);
        return module;
      },
      error => {
        URL.revokeObjectURL(src);
        throw error;
      }
    );
  }
</script>
```

## 迭代策略

- 将 UMD 的格式支持抽离到外部扩展中，同时重构 sandbox 特性
- 通过单元测试、examples 验证和不同构建工具配合使用是否有其他问题
- 在 [web-widget/tree/v0.0.4-beta](https://github.com/web-sandbox-js/web-widget/tree/v0.0.4-beta) 分支中验证

## 兼容性

当本 RFC 实现后，之前的 UMD 的格式应用需要在 WebWidget 容器上声明 `type="umd"` 以及 umd 的 `name` 并且引入 UMD 的模块加载器扩展。例如：

```html
<web-widget type="umd" name="helloWidget" src="./app.widget.js"></web-widget>

<script type="module">
  import '@web-sandbox.js/web-widget';
  import '@web-sandbox.js/web-widget/extensions/WebWidgerUmdLoader.js';
</script>
```
