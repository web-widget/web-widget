# Astro 渲染器设计调查

## 概述

Astro 通过 `AstroRenderer` 接口和 `AstroIntegration` 插件系统实现多 UI 框架支持。每个框架（React、Vue、Svelte 等）提供一个 Integration 包，既注册渲染器，又配置构建工具（Vite）插件。

## AstroRenderer 接口

```typescript
interface AstroRenderer {
  name: string;
  clientEntrypoint?: string; // 浏览器端渲染入口
  serverEntrypoint: string; // 服务端渲染入口
}
```

渲染器接口极其简洁——只有名称和两个入口路径。复杂逻辑全部由承载它的 `AstroIntegration` 处理。

## AstroIntegration 插件系统

Integration 是一个带 hooks 的插件系统，渲染器只是它的一部分：

```typescript
export default function (): AstroIntegration {
  return {
    name: '@astrojs/react',
    hooks: {
      'astro:config:setup': ({ addRenderer, updateConfig, injectScript }) => {
        addRenderer(getRenderer(versionConfig)); // 注册渲染器
        updateConfig({ vite: getViteConfiguration() }); // 注入 Vite 插件
        injectScript('before-hydration', preamble); // 注入脚本
      },
      'astro:config:done': ({ logger, config }) => {
        // 检测多个 JSX 渲染器冲突
        const knownJsxRenderers = [
          '@astrojs/react',
          '@astrojs/preact',
          '@astrojs/solid-js',
        ];
        const enabled = config.integrations.filter((r) =>
          knownJsxRenderers.includes(r.name)
        );
        if (enabled.length > 1 && !include && !exclude) {
          logger.warn('More than one JSX renderer is enabled...');
        }
      },
    },
  };
}
```

Integration 可以做任何事：注册 Vite 插件、注入虚拟模块、处理版本兼容、检测框架冲突、配置环境（`configEnvironment`）。

## 关键设计特征

### 1. 渲染器与构建工具耦合

Integration 直接操作 Vite 配置（`updateConfig({ vite: ... })`）。例如 `@astrojs/react` 在 Integration 中注入 `@vitejs/plugin-react`，`@astrojs/vue` 注入 `@vitejs/plugin-vue`。渲染器不是独立于构建工具的协议。

### 2. 文件匹配不在渲染器中

Astro 通过 `.astro` 文件中的 island 指令（`client:load`、`client:idle` 等）决定哪些组件需要水合，而非通过扩展名匹配。文件匹配由 Integration 内部的 Vite 插件处理。

### 3. 环境分离：显式双入口

渲染器通过 `clientEntrypoint` 和 `serverEntrypoint` 显式指定两个环境的入口。构建工具根据当前环境选择对应的入口。

### 4. 无跨框架互操作

Astro 的各框架组件是平行的，不互相导入。React 组件不会导入 Vue 组件。每个框架组件作为 island 独立水合。

## 与 Web Widget WebWidgetAdapter 的对比

| 维度         | WebWidgetAdapter                   | AstroRenderer                            |
| ------------ | ---------------------------------- | ---------------------------------------- |
| 设计目标     | 跨框架互操作（组件级）             | 多框架共存（页面级）                     |
| 构建工具耦合 | 无（纯数据协议）                   | 强耦合（Integration 直接操作 Vite 配置） |
| 环境分离     | 条件导出（`worker`/`browser`）     | 显式双入口                               |
| 文件匹配     | `extensions`（原子化）             | 由 Integration 内部的 Vite 插件处理      |
| 容器函数     | 有（`container`，跨框架导入）      | 无（框架间不互操作）                     |
| 智能分布     | 适配器只提供数据，构建工具执行转换 | Integration 承载全部逻辑                 |
| 冲突检测     | `scope` 字段消歧                   | `astro:config:done` hook 运行时检测      |

## 各自的取舍

### Astro 的优势

简单直接。Integration 可以做任何事——注册 Vite 插件、注入虚拟模块、处理版本兼容、检测冲突。渲染器接口只有三个字段，因为复杂逻辑都放在 Integration 里了。对于一个绑定特定构建工具的框架来说，这是务实的选择。

### Astro 的局限

Integration 与 Vite 深度耦合。如果 Astro 要支持 Rspack，每个 Integration 都需要重写。实际上 Astro 的 Integration 生态就是 Vite 插件生态的子集。

### Web Widget 的优势

协议层解耦。`WebWidgetAdapter` 是纯数据，不依赖任何构建工具 API。同一个适配器包可以被 Vite、Webpack、Rspack 等任何构建工具消费。

### Web Widget 的局限

纯数据协议的表达力有限。适配器无法主动注入构建工具特定的优化。所有构建工具必须自行实现转换逻辑。

## 对 WebWidgetAdapter 协议的启示

1. **纯数据设计是正确选择**——因为目标是构建工具无关。Astro 不需要这个目标，所以可以用更耦合的方式。

2. **`container` 是独有核心价值**——Astro 没有跨框架互操作，所以不需要容器函数。这是 `WebWidgetAdapter` 比 `AstroRenderer` 多出的维度。

3. **环境分离方式不同但等价**——条件导出更优雅（单路径自动解析），但依赖构建工具正确支持 `exports` 条件。

4. **文件冲突检测值得借鉴**——Astro 在 config 阶段检测多个 JSX 渲染器冲突并给出警告。`scope` 字段解决了同一问题，但构建工具在扩展名冲突且无 `scope` 消歧时应给出明确警告。

## 参考文件

- `packages/astro/src/types/public/integrations.ts` — `AstroRenderer` 接口定义
- `packages/integrations/react/src/index.ts` — React Integration 实现
- `packages/integrations/vue/src/index.ts` — Vue Integration 实现
- `packages/integrations/vue/src/container-renderer.ts` — Vue 渲染器工厂
