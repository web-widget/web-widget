# Web Widget 构建工具自动转换机制

## 概述

Web Widget 的强大之处在于其构建工具能够自动将不同框架的 UI 组件转换为统一的模块接口，开发者无需手动编写适配代码。本文档详细分析了 `@web-widget/vite-plugin` 的工作原理和实现机制。

## Vite 插件架构

Web Widget 提供了专门的 Vite 插件 `@web-widget/vite-plugin`，它包含两个核心插件：

1. **Export Render Plugin**: 自动注入渲染函数到组件模块
2. **Import Render Plugin**: 自动转换组件导入为 Web Widget 容器

### 插件入口

```typescript
// packages/vite-plugin/src/web-widget.ts
export function webWidgetPlugin(options: WebWidgetUserConfig): Plugin[] {
  const {
    manifest,
    provide,
    toWebWidgets,
    toComponents,
    export: exports = toWebWidgets,
    import: imports = toComponents,
  } = options;

  return [
    ...exportRenderPlugin({
      extractFromExportDefault: exports?.extractFromExportDefault,
      exclude: exports?.exclude,
      include: exports?.include,
      inject: exports?.inject,
      manifest,
      provide,
    }),

    ...importRenderPlugin({
      cache: imports?.cache,
      component: imports?.component,
      exclude: imports?.exclude,
      excludeImporter: imports?.excludeImporter,
      include: imports?.include,
      includeImporter: imports?.includeImporter,
      inject: imports?.inject,
      manifest,
      provide,
    }),
  ];
}
```

## Export Render Plugin - 自动注入渲染函数

### 核心功能

这个插件负责自动检测组件文件并注入框架特定的渲染函数：

```typescript
// packages/vite-plugin/src/export-render.ts
export function exportRenderPlugin({
  exclude,
  extractFromExportDefault,
  include,
  inject = 'render',
  manifest,
  provide,
}: ExportRenderPluginOptions): Plugin[];
```

### 工作流程

1. **文件检测**: 通过 `include` 模式匹配检测组件文件
2. **导出分析**: 使用 `es-module-lexer` 分析模块的导出
3. **渲染函数注入**: 自动注入 `render` 函数
4. **默认导出处理**: 处理 `export default` 的组件

### 转换示例

**转换前（开发者编写的组件）:**

```tsx
// Counter@widget.tsx
import { useState } from 'react';

export default function Counter({ count }) {
  const [count, setCount] = useState(count);
  return <div>{count}</div>;
}
```

**转换后（构建工具自动生成）:**

```tsx
import { render as __$render$__ } from '@web-widget/react';
export const render = __$render$__;

export default function Counter({ count }) {
  const [count, setCount] = useState(count);
  return <div>{count}</div>;
}
```

### 高级功能

#### 从默认导出中提取属性

```typescript
extractFromExportDefault: [
  {
    name: 'meta',
    default: '{}',
    include: /\.@route\.(tsx|jsx|vue)$/,
  },
];
```

这会从默认导出中提取 `meta` 属性，如果不存在则使用默认值 `{}`。

#### 元数据自动注入

在构建阶段，插件还会自动注入资源链接信息：

```typescript
// 自动注入 meta.link
((meta) => {
  const link = [
    { rel: 'stylesheet', href: '/assets/Counter-abc123.css' },
    { rel: 'modulepreload', href: '/assets/Counter-def456.js' },
  ];
  meta.link ? meta.link.push(...link) : (meta.link = link);
})(meta);
```

## Import Render Plugin - 自动转换组件导入

### 核心功能

这个插件负责将普通的组件导入转换为 Web Widget 容器：

```typescript
// packages/vite-plugin/src/import-render.ts
export function importRenderPlugin({
  cache = globalCache,
  component,
  exclude,
  excludeImporter,
  include,
  includeImporter = component,
  inject = 'defineWebWidget',
  manifest,
  provide,
}: ImportRenderPluginOptions): Plugin[];
```

### 工作流程

1. **导入检测**: 检测组件导入语句
2. **路径解析**: 解析组件文件路径
3. **容器转换**: 转换为 `defineWebWidget` 调用
4. **资源优化**: 处理开发和生产环境的资源路径

### 转换示例

**转换前（开发者编写的导入）:**

```tsx
import MyComponent from '../widgets/my-component@widget.vue';

export default function Page() {
  return <MyComponent title="My component" />;
}
```

**转换后（构建工具自动生成）:**

```tsx
import { defineWebWidget as __$defineWebWidget$__ } from '@web-widget/react';
const MyComponent = __$defineWebWidget$__(
  () => import('../widgets/my-component@widget.vue'),
  {
    import: 'asset://widgets/my-component@widget.vue',
    name: 'MyComponent',
  }
);

export default function Page() {
  return <MyComponent title="My component" />;
}
```

### 资源协议处理

插件使用特殊的 `asset://` 协议来处理资源路径：

```typescript
const ASSET_PROTOCOL = 'asset:';
const ASSET_PLACEHOLDER_REG = /(["'`])asset:\/\/(.*?)\1/g;
const ASSET_PLACEHOLDER = `${ASSET_PROTOCOL}//`;
```

在构建阶段，这些占位符会被替换为实际的资源路径。

## 框架特定的插件配置

### React 插件配置 (`@web-widget/react`)

```typescript
// packages/react/src/vite.ts
export default function reactWebWidgetPlugin(
  options?: ReactWebWidgetPluginOptions
) {
  return webWidgetPlugin({
    provide: '@web-widget/react',
    export: {
      include: new RegExp(
        `^${workspacePattern}[^?]*${modulesPattern}\\.(?:tsx|jsx)$`
      ),
      // 匹配 .@widget.tsx 和 .@route.tsx 文件
    },
    import: {
      include: new RegExp(`^[^?]*[.@]widget\\.[^?]*$`),
      includeImporter: new RegExp(`^${workspacePattern}[^?]*\\.(?:tsx|jsx)$`),
      // 匹配 .@widget 文件并在 .tsx/.jsx 文件中转换导入
    },
  });
}
```

### Vue 插件配置 (`@web-widget/vue`)

```typescript
// packages/vue/src/vite.ts
export default function vueWebWidgetPlugin(
  options?: VueWebWidgetPluginOptions
) {
  return webWidgetPlugin({
    provide: '@web-widget/vue',
    export: {
      include: new RegExp(`^${workspacePattern}[^?]*${modulesPattern}\\.vue$`),
      // 匹配 .@widget.vue 和 .@route.vue 文件
    },
    import: {
      include: new RegExp(`^[^?]*[.@]widget\\.[^?]*$`),
      includeImporter: new RegExp(`^${workspacePattern}[^?]*\\.vue$`),
      // 匹配 .@widget 文件并在 .vue 文件中转换导入
    },
  });
}
```

### 文件命名约定

插件通过文件命名约定来识别不同类型的模块：

- **`.@widget.tsx`**: React 组件
- **`.@widget.vue`**: Vue 组件
- **`.@route.tsx`**: React 路由页面
- **`.@route.vue`**: Vue 路由页面

## 实际使用示例

### Vite 配置

```typescript
// examples/react/vite.config.ts
export default defineConfig({
  plugins: [
    webRouterPlugin({
      serverAction: { enabled: true },
      filesystemRouting: { enabled: true },
      importShim: { enabled: true },
    }),
    [react(), reactWebWidgetPlugin()], // React 支持
    [vuePlugin(), vueWebWidgetPlugin()], // Vue 支持
  ],
});
```

### 多框架组件共存

```tsx
// 在同一个页面中使用不同框架的组件
import ReactCounter from './(components)/Counter@widget.tsx';
import VueCounter from './(components)/Counter@widget.vue';

export default function Page() {
  return (
    <div>
      <h1>多框架组件演示</h1>
      <div>
        <h2>React 组件</h2>
        <ReactCounter count={0} />
      </div>
      <div>
        <h2>Vue 组件</h2>
        <VueCounter count={0} />
      </div>
    </div>
  );
}
```

## 构建时优化

### 代码分割

构建工具会自动为每个 widget 创建独立的 chunk：

```typescript
// 自动代码分割
this.emitFile({
  type: 'chunk',
  id: moduleId,
  preserveSignature: 'allow-extension',
  importer: id,
});
```

### 资源映射

处理开发和生产环境的资源路径差异：

```typescript
const clientModuleId = dev
  ? toDevUrl(asset, base) // 开发环境
  : ssr
    ? ASSET_PLACEHOLDER + asset // 构建: 服务端
    : this.emitFile({
        /* 构建: 客户端 */
      }); // 构建: 客户端
```

### 类型安全

保持 TypeScript 类型信息，确保编译时类型检查：

```typescript
// 类型安全的转换
const MyComponent = defineWebWidget<
  (typeof import('./Counter@widget.vue'))['default']
>(() => import('./Counter@widget.vue'), { name: 'MyComponent' });
```

## 高级配置选项

### 自定义转换规则

```typescript
webWidgetPlugin({
  provide: '@web-widget/custom',
  export: {
    include: /\.@widget\.(tsx|jsx|vue|svelte)$/,
    exclude: /node_modules/,
    inject: ['render', 'meta'],
  },
  import: {
    include: /\.@widget\.[^?]*$/,
    includeImporter: /\.(tsx|jsx|vue|svelte)$/,
    inject: 'defineCustomWidget',
  },
});
```

### 缓存优化

```typescript
const cache = new Set<string>();

webWidgetPlugin({
  import: {
    cache,
    // 避免重复转换相同的模块
  },
});
```

## 总结

Web Widget 的构建工具通过以下机制实现了真正的"零配置"多框架支持：

1. **自动检测**: 通过文件命名约定自动识别组件类型
2. **自动注入**: 自动注入框架特定的渲染函数
3. **自动转换**: 自动转换组件导入为 Web Widget 容器
4. **资源优化**: 自动处理构建时的资源优化和代码分割
5. **类型保持**: 保持完整的 TypeScript 类型信息

这种设计使得开发者可以：

- 使用熟悉的框架语法编写组件
- 无需关心框架间的兼容性
- 享受自动化的构建优化
- 在同一个应用中无缝集成不同框架的组件

构建工具的自动化程度之高，使得 Web Widget 真正实现了"写一次，到处运行"的愿景。
