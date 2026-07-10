# BUG: vite-plugin 3.0.0-beta.0 与 vitest 4 兼容性问题

## 概述

`@web-widget/vite-plugin` 3.0.0-beta.0 迁移到 Vite 8 Environment API 后，与 vitest 4 的 Module Runner 存在多处兼容性问题。本文档记录了在大型 Vue 2 项目中升级时发现的所有问题、重现方法和建议修复。

**环境**:

- `@web-widget/vite-plugin`: 3.0.0-beta.0
- `vitest`: 4.1.10
- `vite`: 8.0.14
- `@vitejs/plugin-vue2`: 2.3.1
- Node.js: >= 20.0.0

---

## BUG 1: CSS 模块被 es-module-lexer 解析导致构建失败

### 严重程度: High

### 现象

任何包含 `<style>` 的 `.vue` widget 文件在测试运行时触发 `Parse error`，导致整个测试套件无法启动。

### 重现

1. 创建一个包含 `<style scoped>` 的 widget 文件 `index.widget.vue`
2. 在测试中导入该 widget
3. 运行 `vitest run`

### 错误信息

```
Parse error: Unexpected token
Plugin: @web-widget:export-render 或 @web-widget:import-render
File: xxx.vue?vue&type=style&index=0&lang.css
```

### 根因

`exportRenderPlugin` 和 `importRenderPlugin` 的 `transform` 钩子用 `es-module-lexer` 解析所有匹配文件的 exports/imports。当 Vite 的 `@vitejs/plugin-vue2` 生成 CSS 子模块（`*.vue?vue&type=style&index=0&lang.css`）时，这些 CSS 内容不是合法的 JS，`es-module-lexer.parse()` 抛出异常，插件直接调用 `this.error()` 终止。

### 建议修复

在 `exportRenderPlugin` 和 `importRenderPlugin` 的 parse catch 块中，检查 `CSS_LANGS_RE.test(id)`，CSS 模块直接返回 `null` 跳过：

```js
} catch (error) {
  if (CSS_LANGS_RE.test(id)) {
    return null;
  }
  return this.error(error);
}
```

---

## BUG 2: `?direct` query 未被 `importRenderPlugin` 跳过

### 严重程度: Critical

### 现象

使用 `?direct` query 导入 widget 文件时，组件内部的 widget 子导入被 `importRenderPlugin` 替换为 `defineWebWidget` 包装，破坏了原始 Vue 组件结构，导致 `[Vue warn]: Failed to mount component: template or render function not defined.`

### 重现

1. 创建两个 widget 文件：`parent.widget.vue` 和 `child.widget.vue`
2. `parent.widget.vue` 中 `import Child from './child.widget.vue'`
3. 测试中 `import Parent from './parent.widget.vue?direct'`
4. 运行测试，尝试 mount Parent 组件

### 错误信息

```
[Vue warn]: Failed to mount component: template or render function not defined.
```

### 根因

`?direct` 的语义是"跳过 web-widget 的 render 注入，直接导入原始组件"。`exportRenderPlugin` 通过 `normalizeFilterId(id)` 保留了 `?direct` query，使其不匹配 `\.vue$` 正则，从而正确跳过。

但 `importRenderPlugin` 用 `stripModuleIdQuery(id)` 去掉**所有** query，导致 `index.widget.vue?direct` 被当作普通 widget importer 处理。插件将组件内部的 `import Child from './child.widget.vue'` 替换为 `defineWebWidget` 包装，破坏了原始组件的导入链。

### 建议修复

在 `importRenderPlugin` 的 `transform` 中，当 importer id 包含 `?direct` 时直接返回 `null`：

```js
async transform(code, id) {
  // ...
  const importerMatched = importerFilter(normalizedImporterId);
  if (!importerMatched) {
    return null;
  }
  if (id.includes("?direct")) {
    return null;
  }
  // ...
}
```

---

## BUG 3: 动态 import `?direct` 模块被拦截并抛出 SyntaxError

### 严重程度: Critical

### 现象

在测试文件中使用 `await import('./xxx.widget.vue?direct')` 时，`importRenderPlugin` 抛出 `SyntaxError: Dynamic imports are not supported.`，阻止测试运行。

### 重现

1. 在测试文件（`.ts` 或 `.tsx`）中写 `const { default: Comp } = await import('./xxx.widget.vue?direct')`
2. 运行 `vitest run`

### 错误信息

```
SyntaxError: Dynamic imports are not supported.
Plugin: @web-widget:import-render
```

### 根因

`importRenderPlugin` 的 `includeImporter` 默认为 `undefined`（当 `component` 参数未提供时），导致 `createFilter(undefined, exclude)` 匹配**所有**不匹配 `exclude` 的文件，包括 `.ts` / `.tsx` 测试文件。

当测试文件中的 `await import('./xxx.widget.vue?direct')` 被检测到时：

1. `this.resolve()` 解析模块路径，返回 `xxx.widget.vue?direct`
2. `stripModuleIdQuery()` 去掉 `?direct`，得到 `xxx.widget.vue`
3. `filter()` 匹配 widget 文件，`importMatched` 为 `true`
4. `dynamicImport !== -1` 为 `true`，直接抛出 `SyntaxError`

`?direct` query 的语义被完全忽略。

### 建议修复

在 dynamic import 检查前，如果 importModule 包含 `?direct` query 则跳过：

```js
if (importModule && importMatched) {
  if (isSelfImport) {
    continue;
  }
  if (importModule.includes("?direct")) {
    continue;
  }
  if (dynamicImport !== -1) {
    return this.error(
      new SyntaxError(`Dynamic imports are not supported.`),
      statementStart
    );
  }
  // ...
}
```

---

## BUG 4: `@web-widget/node` 客户端断开时未 cancel 上游 ReadableStream

### 严重程度: Medium

### 现象

`@web-widget/node` 3.0.0 在客户端断开连接时不会 cancel 上游的 ReadableStream source，导致上游资源泄漏。

### 重现

1. 创建一个使用 `renderToStream` 的路由
2. 在客户端请求后中途断开连接（abort）
3. 检查上游 source stream 是否收到 cancel 信号

### 错误信息

```
AssertionError: expected 'abort' to be 'cancel'
```

### 根因

`@web-widget/node` 的 Node adapter 在响应 `close` / `aborted` 事件时，仅终止了响应写入，未调用上游 `source.cancel()`，导致 ReadableStream 的 source 无法感知到消费者已断开。

### 建议修复

在客户端 abort 时调用 `source.cancel()` 传播取消信号。参考 changeset `node-adapter-stream-backpressure.md` 中提到的 "cancel source streams on client disconnect" 目标。

---

## BUG 5: `@web-widget/html` 3.0.0 cancel 行为变更未文档化

### 严重程度: Low

### 现象

`@web-widget/html` 3.0.0 中 `renderToStream` 的 cancel 行为变更：cancel 不再将错误传播到 writer 的 `aborted` 事件，与 2.x 行为不兼容。

### 重现

1. 使用 `renderToStream` 渲染一个流式 HTML 响应
2. 在渲染过程中 cancel 流
3. 检查 writer 的 `aborted` 事件是否触发

### 错误信息

```
AssertionError: expected 'abort' to be 'cancel'
```

### 根因

`@web-widget/html` 3.0.0 internalize 了 stream 工具（changeset `html-internalize-stream-utils.md`），新的 `asyncIterToStream` 在 cancel 时调用 `iterator.return()` 而非 `iterator.throw()`，符合 WHATWG Streams spec，但行为与 2.x 不一致。

### 建议修复

在 changeset 或 migration guide 中明确记录此行为变更，标注为 breaking change。

---

## 附：vitest 4 相关问题（非 web-widget 直接 Bug）

以下问题由 vitest 4 Module Runner 引入，不是 `@web-widget/vite-plugin` 的直接 Bug，但影响了使用 web-widget 的项目：

| 问题                                       | 根因                                                 | 修复方式                                 |
| ------------------------------------------ | ---------------------------------------------------- | ---------------------------------------- |
| `vi.resetModules()` 后静态 import 失效     | vitest 4 Module Runner 重置模块注册表后 ESM 绑定失效 | 改用动态 `await import()`                |
| jsdom 不提供 `matchMedia`                  | vitest 4 的 jsdom 环境缺少 `window.matchMedia`       | 在 setup 文件中添加 polyfill             |
| uuid v10 CJS default import 返回 undefined | vitest 4 Module Runner 对 CJS interop 更严格         | patch `wrapper.mjs` 使用 `createRequire` |
| mock 箭头函数不能被 `new` 调用             | vitest 4 要求构造函数 mock 使用 `function`/`class`   | 将箭头函数改为 `function`                |
| 动态 import 需要更多微任务轮次             | Module Runner 异步加载链更长                         | 增加 `await Promise.resolve()` 循环次数  |
