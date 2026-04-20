# RFC 001: UI 框架适配器格式标准

## 摘要

本文档定义 UI 框架适配器的标准格式，旨在创建一个框架无关的适配器接口规范。通过标准化适配器格式，任何 UI 框架都可以实现统一的接口来获得 Web Widget 生态系统的支持，而无需了解具体的构建工具实现细节。

## 动机

### 当前状态

Web Widget 生态系统目前面临以下挑战：

1. **框架绑定**: 每个 UI 框架都需要提供专门的构建工具插件
2. **重复实现**: 不同框架的适配器实现逻辑相似但互不兼容
3. **工具依赖**: 新框架必须了解特定构建工具（如 Vite）的实现细节
4. **生态碎片**: 缺乏统一的适配器标准，限制了框架间的互操作性

### 问题分析

- **技术耦合**: 框架适配器与特定构建工具紧密耦合
- **维护负担**: 构建工具更新需要同步到所有框架适配器
- **学习成本**: 新框架开发者需要学习多种构建工具的插件机制
- **扩展困难**: 难以支持新的构建工具或运行时环境

### 目标

- **格式标准化**: 定义框架无关的适配器接口规范
- **工具解耦**: 适配器格式与具体构建工具实现分离
- **生态统一**: 建立统一的框架集成标准
- **易于扩展**: 支持更多 UI 框架和构建工具的快速集成

## 设计提案

### 1. 通用渲染方法定义

#### 核心概念

Web Widget 定义了 UI 框架组件的通用渲染方法，使不同框架的组件能够互操作：

- **通用渲染接口**: 统一的客户端和服务端渲染方法
- **组件互操作**: Vue 组件可以导入 React 组件，React 组件可以导入 Vue 组件
- **通用可渲染模块**: 通过文件名中包含 `@widget` 和 `@route` 等标识符识别的模块

#### 适配器格式标准

##### 版本管理

框架适配器格式使用版本号来标识格式版本，便于构建工具进行兼容性检查。

##### 核心接口定义

```typescript
// 组件处理器标准接口
interface ComponentProcessor {
  name: string; // UI 框架标识符

  // 组件文件匹配规则
  files: string[]; // 组件文件匹配模式（如 ["**/*.tsx", "**/*.jsx"]）

  // 渲染函数配置 - 指向条件导出的子路径
  render: string; // 如: "./render"

  // 容器函数配置 - 指向具名导出的子路径（可选）
  container?: string; // 如: "./container"
}
```

##### 职责分离

- **构建工具配置**: 负责包管理和导入路径（`processors[].from`）
- **适配器配置**: 负责框架特定的功能配置（渲染函数、容器函数等）

##### 构建工具集成配置

构建工具通过配置数组集成不同的适配器包，支持通用可渲染模块的文件识别符配置和转换功能：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    webWidgetPlugin({
      // 通用可渲染模块的文件识别符配置
      modulePatterns: ['@widget', '@route'], // 文件名中包含这些特征的都会被识别为通用渲染模块

      // 框架处理器配置
      processors: [
        {
          name: 'react',
          files: ['**/*.tsx', '**/*.jsx'],
          from: '@web-widget/react', // 从这个包导入处理器配置
        },
        {
          name: 'vue',
          files: ['**/*.vue'],
          from: '@web-widget/vue', // 从这个包导入处理器配置
        },
        {
          name: 'svelte',
          files: ['**/*.svelte'],
          from: '@web-widget/svelte', // 从这个包导入处理器配置
        },
      ],
    }),
  ],
});
```

### 2. 标准格式示例

组件处理器包通过标准格式提供配置，构建工具自动处理组件的转换和渲染函数注入。

### 3. 环境适应性实现

#### 条件导出配置

组件处理器通过 `package.json` 的 `exports` 字段实现环境适应性：

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./render": {
      "worker": {
        "types": "./dist/render.server.d.ts",
        "default": "./dist/render.server.js"
      },
      "browser": {
        "types": "./dist/render.client.d.ts",
        "default": "./dist/render.client.js"
      },
      "default": {
        "types": "./dist/render.server.d.ts",
        "default": "./dist/render.server.js"
      }
    }
  }
}
```

#### 环境检测逻辑

- **`worker`**: 服务端/Worker 环境
- **`browser`**: 浏览器环境
- **`default`**: 默认环境（通常是 Node.js 服务端）

#### 职责分离

- **处理器配置**: 只关心"从哪里导入"（`render: "./render"`）
- **包的条件导出**: 负责"根据环境选择什么"（browser/worker 版本）
- **构建工具**: 不需要关心环境细节，直接使用配置的路径

#### 自动环境适配

```typescript
// 构建工具只需要一个路径
const renderModule = await import(`${packageName}${processor.render}`);

// 包的条件导出自动处理环境差异
// 客户端构建时自动导入 browser 版本
// 服务端构建时自动导入 worker 版本
// 无需手动指定环境
```

#### 标准格式示例

```typescript
// 组件处理器模块标准导出格式
// @web-widget/react/processor.ts
const processor: ComponentProcessor = {

  name: 'react',

  // 组件文件匹配规则
  files: ['**/*.tsx', '**/*.jsx'],

  // 渲染函数配置 - 指向条件导出的子路径
  render: './render',        // 客户端/服务端由条件导出自动处理

  // 容器函数配置 - 指向具名导出的子路径
  container: './container'  // 从 container 子路径导入
};

export default processor;

// 简化处理器示例 - 只使用必需字段
const simpleProcessor: ComponentProcessor = {
  name: 'simple',
  files: ['**/*.simple'],
  render: './render'
  // 其他字段使用默认值
};

export default simpleProcessor;

// @web-widget/react/container.ts
export default function defineWebWidget(options) {
  // Web Widget 容器定义逻辑
}

// @web-widget/react/render/client.ts
export default function createClientRender() {
  // 客户端渲染逻辑
}

// @web-widget/react/render/server.ts
export default function createServerRender() {
  // 服务端渲染逻辑
}

// package.json exports 配置示例
// @web-widget/react/package.json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./container": {
      "types": "./dist/container.d.ts",
      "default": "./dist/container.js"
    },
    "./render": {
      "worker": {
        "types": "./dist/render.server.d.ts",
        "default": "./dist/render.server.js"
      },
      "browser": {
        "types": "./dist/render.client.d.ts",
        "default": "./dist/render.client.js"
      },
      "default": {
        "types": "./dist/render.server.d.ts",
        "default": "./dist/render.server.js"
      }
    }
  }
}
```

```typescript
// 方式 1: 显式配置（推荐用于生产环境）
import { defineConfig } from 'vite';
import { webWidgetPlugin } from '@web-widget/vite-plugin';

export default defineConfig({
  plugins: [
    webWidgetPlugin({
      modulePatterns: ['@widget', '@route'], // 文件名中包含这些特征的都会被识别为通用渲染模块
      processors: [
        {
          name: 'react',
          files: ['**/*.tsx', '**/*.jsx'],
          from: '@web-widget/react', // 从这个包导入适配器配置
        },
        {
          name: 'vue',
          files: ['**/*.vue'],
          from: '@web-widget/vue', // 从这个包导入适配器配置
          options: {
            /* Vue 特定选项 */
          },
        },
      ],
    }),
  ],
});
```

```typescript
// @web-widget/react/index.ts
import { processor } from './processor';

// 默认导出 ComponentProcessor 配置
export default processor;

// 可选：导出 Vite 插件（向后兼容）
export { default as vitePlugin } from './vite';

// @web-widget/vue/index.ts
export default processor;

// @web-widget/svelte/index.ts
export default processor;
```
