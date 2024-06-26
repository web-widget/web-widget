- 开始日期：2021-10-09
- 作者：糖饼

# 目标

- 解决使用 Webpack 的 externals 构建出的 UMD 模块无法运行的问题 [#24](https://github.com/web-widget/web-widget/issues/24)
- 保持向后兼容，例如使用 [ShadowRealm](https://tc39.es/proposal-shadowrealm/) 实现沙箱

# 动机

WebSandbox 的沙箱实现采用了 TC39 Realms 第二阶段规范实现的，它本质上是一个特殊的 `eval()` 语句，无法使用 ES module，因此 Web Widget 容器基于照顾沙盒的实现考虑不得不使用了 UMD 模块格式。在几个月前，Realms 走向了第三阶段，它的 API 发生了重大的变更（也更名为 ShadowRealm），它的 API 更像是一个特殊的 `import()`，完全针对 ES module 而设计。[ShadowRealm API 示范](https://github.com/leobalter/realms-polyfill/blob/main/README.md)

要完整的实现 UMD 的依赖管理是一个比较复杂的事情，而这些工作并不是 Web Widget 容器的核心目标，因此现在 Web Widget 容器只实现了 commonjs 子集，因此应用一旦存在 `require()` 语句将会导致执行出错，导致类似的问题 [#24](https://github.com/web-widget/web-widget/issues/24) 发生。

上述两个问题都指向同一个问题：无论从未来标准以及当前实践层面的兼容性考虑，我们都需要重新考虑 Web Widget 容器的默认模块类型。

# 产出

- 与标准对齐，让 Web Widget 的解决方案拥有更长的生命力
- 能够和各种构建工具配合使用，避免干扰它们，例如 Webpack 与 Vite 等
- 开发者可以通过加载器勾子函数完实现对第三方模块的加载，例如 System 等

# 提议内容

- 使用 ES module 作为 Web Widget 容器的默认模块格式，`type` 属性默认值变更为 `"module"`
- 删除 UMD 格式的内置支持
- Web Widget 容器增加 `createLoader()` 钩子函数

## 指引和例子

### 使用 ES module 模块

```html
<web-widget src="app.widget.js"></web-widget>
<script type="module">
  import '@web-widget/container';
</script>
```

如果不指定 `type` 的属性的情况下，它将 app.widget.js 作为 ES module 处理。

### 使用 system 模块

```html
<web-widget src="app.widget.js" type="system"></web-widget>
<script type="module">
  import '@web-widget/container';
  import 'systemjs';

  const createLoader = HTMLWebWidgetElement.prototype.createLoader;
  HTMLWebWidgetElement.prototype.createLoader = function () {
    const { src, type } = this;

    if (type !== 'system') {
      return createLoader.apply(this, arguments);
    }

    return System.import(src).then((module) => module.default || module);
  };
</script>
```

## 迭代策略

- 将 UMD 的格式支持抽离到外部扩展中，同时重构 sandbox 特性
- 通过单元测试、examples 验证和不同构建工具配合使用是否有其他问题
- 在 [web-widget/tree/v0.0.4-beta](https://github.com/web-widget/web-widget/tree/v0.0.4-beta) 分支中验证

## 兼容性

当本 RFC 实现后，之前的 UMD 的格式应用需要在 Web Widget 容器上声明 `type="umd"` 与 `name=moduleName` 属性，并且引入 UMD 的模块加载器扩展。例如：

```html
<web-widget type="umd" name="helloWidget" src="./app.widget.js"></web-widget>

<script type="module">
  import '@web-widget/container';
  import '@web-widget/umd-loader';
</script>
```
