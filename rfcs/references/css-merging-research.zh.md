# 主流元框架 CSS 合并/内联策略调研

## 背景

本框架在渲染路由时，会从 Vite client manifest 中收集每个 CSS 文件并生成单独的 `<link rel="stylesheet">` 标签。核心逻辑位于 [manifest-links.ts](file:///Users/tangbin/Git/web-widget/packages/vite-plugin/src/internal/manifest-links.ts)，其中 `getLink()` 函数为每个 `.css` 文件创建一个独立的 `<link>` 描述符：

```typescript
function getLink(fileName: string, base: string): LinkDescriptor | null {
  const ext = path.extname(fileName);
  if (ext === '.css') {
    return { href: rebase(fileName, base), rel: 'stylesheet' };
  }
  // ...
}
```

在大型项目中，一个路由可能依赖数十个 CSS 模块，导致 HTML 中出现大量 `<link>` 标签，增加 HTTP 请求数和渲染阻塞。

本调研旨在了解主流元框架（Next.js、SvelteKit、Nuxt、Astro、Qwik、React Router 7、SolidStart、TanStack Router）是否有类似的 CSS 合并或内联实践，以论证在本框架中实现 CSS 合并的可行性。

## 1. Next.js：CSS Chunking 插件

**策略：构建时合并 CSS chunk，减少 `<link>` 数量；支持 webpack 和 Turbopack 两种打包器**

Next.js 实现了 CSS chunk 合并机制，在构建阶段将多个小的 CSS chunk 合并为更大的 chunk，同时保证不违反导入顺序。webpack 使用 `CssChunkingPlugin` 插件，Turbopack 使用独立的图算法。

### 关键代码

- **webpack 插件**：[packages/next/src/build/webpack/plugins/css-chunking-plugin.ts](https://github.com/vercel/next.js/blob/41114a31b87694c92614a7ab20656ce895a8c6b7/packages/next/src/build/webpack/plugins/css-chunking-plugin.ts)
- **配置解析**：[packages/next/src/server/config-shared.ts](https://github.com/vercel/next.js/blob/41114a31b87694c92614a7ab20656ce895a8c6b7/packages/next/src/server/config-shared.ts)

### 核心机制

1. **大小限制**：
   - `MIN_CSS_CHUNK_SIZE = 30 * 1024`（30KB）
   - `MAX_CSS_CHUNK_SIZE = 100 * 1024`（100KB）

2. **四种模式**（通过 `resolveCssChunkingMode()` 归一化）：
   - **`'off'`**（`false`/`undefined`）：不执行 CSS chunking
   - **`'loose'`**（`true`/`'loose'`，**默认**）：webpack 启发式合并。通过分析模块在各 chunk 中的索引顺序来猜测依赖关系——当模块 a 在所有包含 b 的 chunk 中都出现在 b 之前时，认为 a 依赖 b。
   - **`'strict'`**（`'strict'`，webpack 专用）：严格检查添加模块不会违反任何 chunk 中的导入顺序。
   - **`'graph'`**（`'graph'`，Turbopack 专用）：基于图的合并算法，支持 `requestCost` 和 `weightDistribution` 参数。通过 `groupSize ^ (-weightDistribution)` 公式为每个 chunk 组计算权重——`weightDistribution` 越大，小页面越优先减少无关样式，但整体请求数会增加；`0` 时所有 chunk 组权重相等。

3. **算法流程**（webpack loose/strict 模式）：
   - 收集所有 CSS 模块 → 按索引和排序 → 贪心地尝试将模块合并到新 chunk 中 → 检查大小限制和依赖/顺序约束 → 创建新 chunk 并重新连接模块

4. **全局 CSS 保护**：非 `.module.css` 的全局 CSS 不会泄漏到不相关的 chunk 中。

5. **配置类型**：`boolean | 'strict' | 'loose' | 'graph' | { type: 'strict' } | { type: 'loose' } | { type: 'graph'; requestCost?: number; weightDistribution?: number }`，默认 `true`（即 `'loose'`）。

6. **打包器兼容性**：`'graph'` 仅支持 Turbopack，`'strict'` 和 `false` 仅支持 webpack，在配置校验阶段会拒绝不兼容的组合。

### 关键代码片段

```typescript
class CssChunkingPlugin {
  constructor({ strict }: { strict: boolean }) { ... }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.thisCompilation.tap('CssChunkingPlugin', (compilation) => {
      compilation.hooks.optimizeChunks.tap(
        { name: 'CssChunkingPlugin', stage: 5 },
        () => { /* 合并逻辑 */ }
      );
    });
  }
}

// 配置模式归一化
export function resolveCssChunkingMode(
  value: CssChunkingConfig | undefined
): 'off' | 'loose' | 'strict' | 'graph' {
  if (value === undefined || value === false) return 'off'
  if (value === true || value === 'loose') return 'loose'
  if (value === 'strict' || value === 'graph') return value
  if (value.type === 'strict') return 'strict'
  if (value.type === 'graph') return 'graph'
  return 'loose'
}
```

## 2. SvelteKit：CSS 内联 + bundleStrategy 三种打包策略

**策略：根据 `bundleStrategy` 提供三种 CSS 策略——`split` 模式按路由拆分 + 小 CSS 内联；`single` 模式打包为单个 JS bundle；`inline` 模式将所有 JS 和 CSS 内联到 HTML**

SvelteKit 的 CSS 处理由 `kit.output.bundleStrategy` 配置决定，三种模式对应不同的 CSS 策略：

- **`'split'`**（默认）：CSS code splitting 开启，配合 `inlineStyleThreshold` 将小 CSS 文件内联到 `<style>` 标签
- **`'single'`**：所有 JS 打包为单个 bundle，CSS 仍可拆分
- **`'inline'`**：设置 `cssCodeSplit: false`，**所有 JS 和 CSS 内联到 HTML**——从 client chunks 中找到 `style.css`，将其内容直接嵌入 HTML，是最激进的内联策略

### 关键代码

#### 构建阶段：收集可内联的 CSS（split 模式）

- **文件**：[packages/kit/src/exports/vite/build/build_server.js](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/kit/src/exports/vite/build/build_server.js)

#### bundleStrategy 配置实现

- **文件**：[packages/kit/src/exports/vite/index.js](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/kit/src/exports/vite/index.js)

```javascript
// inline 模式下禁用 CSS code splitting，所有 CSS 打包为单个 style.css
cssCodeSplit: svelte_config.kit.output.bundleStrategy !== 'inline',

// inline 模式下将 style.css 内容嵌入 HTML
if (svelte_config.kit.output.bundleStrategy === 'inline') {
  const style = client_chunks.find(
    (chunk) => chunk.type === 'asset' && chunk.names.length === 1 && chunk.names[0] === 'style.css'
  );
  build_data.client.inline = { script: ..., style: style?.source };
}
```

```javascript
// 收集小于阈值的 CSS 文件
const stylesheets_to_inline = new Map();

if (
  chunks &&
  kit.inlineStyleThreshold > 0 &&
  kit.output.bundleStrategy === 'split'
) {
  for (const chunk of chunks) {
    if (chunk.type !== 'asset' || !chunk.fileName.endsWith('.css')) continue;
    const source = chunk.source.toString();
    if (source.length < kit.inlineStyleThreshold) {
      stylesheets_to_inline.set(chunk.fileName, source);
    }
  }
}

// 为每个路由节点生成 inline_styles 函数
if (stylesheets_to_inline.size) {
  const inline_styles = [];
  stylesheets.forEach((file, i) => {
    if (stylesheets_to_inline.has(file)) {
      const css = stylesheets_to_inline.get(file);
      fs.writeFileSync(
        dest,
        `export default ${prepare_css_for_inlining(css)};`
      );
      imports.push(`import stylesheet_${i} from '...';`);
      inline_styles.push(`\t${s(file)}: stylesheet_${i}`);
    }
  });
  exports.push(
    `export const inline_styles = () => ({\n${inline_styles.join(',\n')}\n});`
  );
}
```

#### 运行时：合并内联样式并禁用已内联的样式表

- **文件**：[packages/kit/src/runtime/server/page/render.js](https://github.com/sveltejs/kit/blob/18801aec2208d8535b957733a11ed813026b2b28/packages/kit/src/runtime/server/page/render.js)

```javascript
const inline_styles = new Map();
const stylesheets = new Set(client?.stylesheets);

for (const { node } of branch) {
  for (const url of node.stylesheets) stylesheets.add(url);
  if (node.inline_styles && !client?.inline) {
    Object.entries(await node.inline_styles()).forEach(([filename, css]) => {
      inline_styles.set(filename, css);
    });
  }
}

// 合并所有内联样式为一个 <style> 块
const style = Array.from(inline_styles.values()).join('\n');
if (style) head.add_style(style, attributes);

// 对已内联的样式表添加 disabled 属性，防止 Vite 重复加载
for (const dep of stylesheets) {
  const attributes = ['rel="stylesheet"'];
  if (inline_styles.has(dep)) {
    attributes.push('disabled', 'media="(max-width: 0)"');
  }
  head.add_stylesheet(path, attributes);
}
```

### 配置

- `kit.inlineStyleThreshold`（默认 `0`，即不内联）
- 设置为 `Infinity` 可内联所有 CSS
- `kit.output.bundleStrategy`：`'split'`（默认）| `'single'` | `'inline'`

### 设计要点

- 使用 `Array.from(inline_styles.values()).join('\n')` 将多个内联 CSS 合并为一个 `<style>` 块
- 对已内联的样式表通过 `disabled` 和 `media="(max-width: 0)"` 属性来防止 Vite 在客户端重复加载。原理：Vite 通过检测 `<link>` 标签判断 CSS 是否已加载，`disabled` 让浏览器不加载样式，但 Vite 仍能检测到该标签存在从而跳过重复注入
- `inlineStyleThreshold` 仅在 `bundleStrategy === 'split'` 时生效
- `bundleStrategy === 'inline'` 时，`cssCodeSplit` 设为 `false`，所有 CSS 打包为单个 `style.css` 并内联到 HTML
- CSS 中的 `url()` 引用通过 Svelte 的 CSS 解析器处理（非 `lightningcss`），支持 `paths.assets` 和 `paths.relative` 的运行时模板化

## 3. Nuxt：SSR 样式内联（features.inlineStyles）

**策略：SSR 渲染时内联 Vue 组件样式，构建时移除已完全内联的 CSS link**

Nuxt 的策略与 SvelteKit 类似，但更侧重于 Vue 组件级别的样式内联。它通过 Vite 插件在构建时跟踪哪些 CSS 已被内联，并在 manifest 中移除对应的 CSS link 引用。

### 关键代码

- **文件**：[packages/vite/src/plugins/ssr-styles.ts](https://github.com/nuxt/nuxt/blob/369a6c64f47095a04e1ba63821088751ff27fe19/packages/vite/src/plugins/ssr-styles.ts)
- **配置默认值**：[packages/schema/src/config/experimental.ts](https://github.com/nuxt/nuxt/blob/369a6c64f47095a04e1ba63821088751ff27fe19/packages/schema/src/config/experimental.ts)

### 核心机制

1. **`shouldInline` 配置**：`nuxt.options.features.inlineStyles`，默认行为如下：
   - **开发模式**：返回 `false`（不内联）
   - **SSR 关闭时**：返回 `false`
   - **生产模式 + SSR**：`(id?: string) => !!id && id.includes('.vue')`（仅内联 Vue 组件样式）

2. **`build:manifest` 钩子**：移除已完全内联的 CSS link

   ```typescript
   // 当一个 chunk 的所有 CSS 源模块都已被内联为 <style> 标签时，
   // 移除该 chunk 的 CSS link 引用，防止重复样式 (#30431)
   for (const chunk of Object.values(manifest)) {
     if (!chunk.css?.length || !chunk.src) continue;
     const cssSources = cssSourcesByChunkSrc.get(chunk.src);
     if (!cssSources?.size) continue;
     let allInlined = true;
     for (const cssId of cssSources) {
       if (!inlinedCSSModuleIds.has(cssId)) {
         allInlined = false;
         break;
       }
     }
     if (allInlined) {
       chunk.css = []; // 移除 CSS link
     }
   }
   ```

3. **`generateBundle` 钩子**：为每个有 CSS 的文件生成虚拟 `*-styles.mjs` 资产，导出 CSS 内容供 SSR 使用

4. **`renderChunk` 钩子**：跟踪每个 chunk 中的 CSS 源模块，建立 `cssMap` 映射

5. **`transform` 钩子**：对客户端 entry，当 `shouldInline` 为 true 时，内联全局 CSS；对 Vue 和 CSS 文件禁用副作用（避免 CSS 被重复输出）

### 已知限制

- Entry CSS（`entry.<hash>.css`）仍会作为 `<link>` 标签渲染
- 社区模块 [nuxt-vitalizer](https://nuxt.com/modules/vitalizer) 可通过 `disableStylesheets: 'entry'` 选项移除该渲染阻塞 CSS

### 配置

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  features: {
    inlineStyles: false, // 或一个函数 (id) => boolean
  },
});
```

## 4. Astro：CSS 传播/去重 + 大小阈值内联

**策略：实现三个独立的 CSS 子插件——CSS 传播与去重、全局合并、大小阈值内联；根据 CSS 大小自动选择内联为 `<style>` 或保留为外部 `<link>`**

Astro 并非"完全依赖 Vite"，而是在 [plugin-css.ts](file:///Users/tangbin/Git/meta-frameworks/astro/packages/astro/src/core/build/plugins/plugin-css.ts) 中实现了三个独立的 Vite 子插件，覆盖 CSS 传播、去重、全局合并和大小阈值内联。

### 关键代码

- **CSS 插件**：[packages/astro/src/core/build/plugins/plugin-css.ts](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/core/build/plugins/plugin-css.ts)
- **内联判断工具**：[packages/astro/src/core/build/plugins/util.ts](https://github.com/withastro/astro/blob/79aa99c648b4b40b95a31d4a961b77074cf7963c/packages/astro/src/core/build/plugins/util.ts)

### 三个子插件

#### 1. `cssBuildPlugin`：CSS 传播与去重

- **SSR 构建时**：跟踪所有 CSS 模块，建立 `cssModuleToChunkIdMap` 映射
- **客户端构建时**：删除已在 SSR 中打包的重复 CSS chunk（`shouldDeleteCSSChunk`），避免重复样式
- 通过 `pagesToCss` 跟踪每个页面的 CSS 及其**导入顺序（order）和深度（depth）**
- 处理 `cssScopeTo` 元数据：当组件被条件渲染（SSR 中未渲染但客户端中渲染），能恢复被删除的 CSS chunk
- 处理 `client:only` 组件的 CSS 归属

#### 2. `singleCssPlugin`：全局合并

当用户设置 `cssCodeSplit: false` 时，将 Vite 的 `style.css` 添加到所有页面：

```javascript
// 如果用户禁用了 CSS code splitting，将 style.css 添加到每个页面
if (resolvedConfig.build.cssCodeSplit) return;
const cssChunk = Object.values(bundle).find(
  (chunk) => chunk.type === 'asset' && chunk.name === 'style.css'
);
if (cssChunk === undefined) return;
for (const pageData of internals.pagesByKeys.values()) {
  const cssToInfoMap = (pagesToCss[pageData.moduleSpecifier] ??= {});
  cssToInfoMap[cssChunk.fileName] = { depth: -1, order: -1 };
}
```

#### 3. `inlineStylesheetsPlugin`：大小阈值内联

根据 `build.inlineStylesheets` 配置决定内联策略：

```javascript
const inlineConfig = settings.config.build.inlineStylesheets;
// 'always' | 'auto'（默认）| 'never'

const toBeInlined =
  inlineConfig === 'always'
    ? true
    : inlineConfig === 'never'
      ? false
      : shouldInlineAsset(stylesheet.source, stylesheet.fileName, assetsInlineLimit);

// 小 CSS 内联为 <style>，大 CSS 保留为外部 <link>
const sheet: StylesheetAsset = toBeInlined
  ? { type: 'inline', content: stylesheet.source }
  : { type: 'external', src: stylesheet.fileName };
```

`'auto'` 模式（默认）下，通过 `shouldInlineAsset` 判断 CSS 大小是否低于 `assetsInlineLimit`（默认 4096 字节），低于则内联，高于则保留为外部引用。对 inline 和 external 样式都做去重检查。

### 配置

```typescript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto', // 'always' | 'auto'（默认）| 'never'
  },
});
```

### 设计要点

- **混合策略**：`'auto'` 模式下，小 CSS 内联为 `<style>`，大 CSS 保留为外部 `<link>`——不是简单的内联或 link 策略
- **SSR/客户端 CSS 去重**：SSR 构建中已打包的 CSS 不会在客户端构建中重复输出
- **`cssScopeTo` 恢复机制**：条件渲染的组件，其被删除的 CSS 可被恢复——这是一个独特的边界情况处理
- **导入顺序跟踪**：`pagesToCss` 记录每个页面 CSS 的 order 和 depth，保证样式优先级正确

## 5. Qwik：禁用 CSS Code Splitting + 组件级内联

**策略：所有非 CSR 构建禁用 `cssCodeSplit`，全局 CSS 合并为单个文件；组件级 scoped CSS 在 SSR 时内联为 `<style>` 标签**

Qwik 采用了两种互补的 CSS 策略：全局 CSS 合并和组件样式内联。

### 关键代码

#### 构建阶段：禁用 CSS code splitting

- **文件**：[packages/qwik/src/optimizer/src/plugins/vite.ts](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik/src/optimizer/src/plugins/vite.ts)

```typescript
// 在 Qwik Vite 插件中，对所有非 CSR 构建禁用 CSS code splitting
// 这对 SSR 和 client 构建都生效，而非仅客户端
if (!qwikViteOpts.csr) {
  updatedViteConfig.build!.cssCodeSplit = false;
  // ...
}
```

将 `cssCodeSplit` 设为 `false` 后，Vite 会将所有 CSS 打包成单个 `style.css` 文件，而非按路由/组件拆分。这意味着整个应用只有一个全局 CSS `<link>` 标签。注意：此设置对所有非 CSR 构建生效（SSR 和 client），而非仅客户端构建。

#### SSR 渲染：组件样式内联为 `<style>` 标签

- **文件**：[packages/qwik/src/core/render/ssr/render-ssr.ts](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik/src/core/render/ssr/render-ssr.ts)

```typescript
// 在 SSR 渲染时，将组件的 scoped 样式内联为 <style> 标签
if (elCtx.$appendStyles$) {
  const isHTML = !!(flags & IS_HTML);
  const array = isHTML ? ssrCtx.$static$.$headNodes$ : extraNodes;
  for (const style of elCtx.$appendStyles$) {
    array.push(
      _jsxQ(
        'style',
        {
          [QStyle]: style.styleId,
          [dangerouslySetInnerHTML]: style.content,
          hidden: '',
        },
        null,
        null,
        0,
        null
      )
    );
  }
}
```

#### 组件样式 API：`useStylesScoped$()`

- **文件**：[packages/qwik/src/core/use/use-styles.ts](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik/src/core/use/use-styles.ts)

Qwik 通过 `useStyles$()` 和 `useStylesScoped$()` hook 管理组件样式。样式通过 `?inline` 查询参数导入（如 `import styles from './code-block.css?inline'`），在 SSR 时内联到 `<head>` 的 `<style>` 标签中，客户端水合时不会重复加载。

#### 开发模式：CSS 作为 `<link>` 注入

- **文件**：[packages/qwik/src/optimizer/src/plugins/vite-dev-server.ts](https://github.com/QwikDev/qwik/blob/c59a430cb87c98a13ec0c8f2a3bc6369fe16f55f/packages/qwik/src/optimizer/src/plugins/vite-dev-server.ts)

```typescript
// 开发模式下，CSS 文件作为 <link rel="stylesheet"> 注入到 head
manifest.injections!.push({
  tag: 'link',
  location: 'head',
  attributes: {
    rel: 'stylesheet',
    href: toDevServerHref(base, url),
  },
});
```

### 设计要点

- **全局 CSS**：通过 `cssCodeSplit = false` 合并为单个文件，只有一个 `<link>` 标签
- **组件 CSS**：通过 `?inline` 导入 + SSR 内联，不产生额外 `<link>` 标签
- **去重**：`containerState.$styleIds$` Set 确保同一样式只内联一次
- **懒加载**：组件样式 QRL 是懒加载的，只在组件实际渲染时才内联

## 6. React Router 7（含 Remix）：路由级 CSS 收集 + 可选合并

**策略：按路由从 Vite manifest 收集 CSS，支持 `cssCodeSplit: false` 全局合并；开发模式通过模块图遍历收集 CSS**

React Router 7（Remix 已合并到 React Router 7）的 CSS 处理分为生产模式和开发模式两种路径。

### 关键代码

#### 生产模式：从 Vite manifest 收集路由 CSS

- **文件**：[packages/react-router-dev/vite/plugin.ts](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-dev/vite/plugin.ts)

```typescript
// 当 cssCodeSplit 为 false 时，所有 CSS 合并为单个 style.css
const getCssCodeSplitDisabledFile = (
  ctx: ReactRouterPluginContext,
  viteConfig: Vite.ResolvedConfig,
  viteManifest: Vite.Manifest,
) => {
  if (viteConfig.build.cssCodeSplit) {
    return null;
  }
  let cssFile = viteManifest["style.css"]?.file;
  invariant(
    cssFile,
    "Expected `style.css` to be present in Vite manifest when `build.cssCodeSplit` is disabled",
  );
  return `${ctx.publicPath}${cssFile}`;
};

// 为每个路由收集 CSS 文件
const getReactRouterManifestBuildAssets = (
  ctx, viteConfig, viteManifest, allDynamicCssFiles, entryFilePath, route,
) => {
  let chunks = resolveDependantChunks(viteManifest, [
    isRootRoute ? getClientEntryChunk(ctx, viteManifest) : null,
    entryChunk,
    routeModuleChunks,
  ].flat(1).filter(isNonNullable));

  return {
    module: `${ctx.publicPath}${entryChunk.file}`,
    imports: dedupe(chunks.flatMap((e) => e.imports ?? [])).map(...),
    css: dedupe([
      // 如果禁用了 CSS code splitting，全局 style.css 放在根路由
      isRootRoute
        ? getCssCodeSplitDisabledFile(ctx, viteConfig, viteManifest)
        : null,
      // 从所有依赖 chunk 中收集 CSS 文件
      chunks.flatMap((e) => e.css ?? []).map((href) => {
        let publicHref = `${ctx.publicPath}${href}`;
        // 对动态导入的 CSS 追加 # hash fragment，避免 Vite 客户端重复管理
        // 原理：Vite 通过 href 检测 CSS 是否已在页面中，追加 # 后 Vite 不识别该标签
        // 从而避免动态导入时 Vite 持有已存在的 link 导致路由切换后样式丢失
        return allDynamicCssFiles.has(href) ? `${publicHref}#` : publicHref;
      }),
    ].filter(Boolean)),
  };
};
```

#### 开发模式：模块图遍历收集 CSS

- **文件**：[packages/react-router-dev/vite/styles.ts](https://github.com/remix-run/react-router/blob/182479060d9419839e538edac7afe64651513d05/packages/react-router-dev/vite/styles.ts)

```typescript
// 开发模式下，通过遍历 Vite 模块图收集路由匹配的 CSS
export const getStylesForPathname = async ({
  viteDevServer,
  rootDirectory,
  reactRouterConfig,
  entryClientFilePath,
  loadCssContents,
  pathname,
}) => {
  let routesWithChildren = createRoutesWithChildren(reactRouterConfig.routes);
  let documentRouteFiles =
    matchRoutes(routesWithChildren, pathname, reactRouterConfig.basename)?.map(
      (match) =>
        path.resolve(appPath, reactRouterConfig.routes[match.route.id].file)
    ) ?? [];

  // 从客户端 entry 和匹配路由的文件中收集 CSS
  let styles = await getStylesForFiles({
    viteDevServer,
    rootDirectory,
    loadCssContents,
    files: [
      path.relative(rootDirectory, entryClientFilePath),
      ...documentRouteFiles,
    ],
  });

  return styles;
};
```

开发模式下，React Router 遍历匹配路由的模块依赖树，收集所有 CSS 文件内容并合并为一个字符串返回（注释中标注逻辑参考自 solid-start）。

### 设计要点

- **生产模式**：每个路由的 CSS 来自 Vite manifest 中该路由 chunk 及其依赖 chunk 的 `css` 字段
- **全局合并**：当用户设置 `build.cssCodeSplit: false` 时，所有 CSS 合并为 `style.css`，放在根路由
- **动态导入处理**：对动态导入的 CSS 文件追加 `#` hash fragment，防止 Vite 客户端 CSS 管理冲突
- **开发模式**：通过模块图遍历收集 CSS，合并为内联 `<style>` 标签
- **CSS Modules**：通过 `transform` 钩子收集 CSS Modules 映射表

## 7. SolidStart：Vite 原生 CSS 处理 + 开发模式模块图遍历

**策略：生产模式依赖 Vite manifest 收集 CSS，开发模式通过模块图遍历收集并内联**

SolidStart 的 CSS 处理与 React Router 7 高度相似，两者在开发模式下使用了几乎相同的模块图遍历算法。

### 关键代码

#### 开发模式：模块图遍历收集 CSS

- **文件**：[packages/start/src/server/collect-styles.ts](https://github.com/solidjs/solid-start/blob/ec1b82bb1ff37d1d7969466404173517490c459d/packages/start/src/server/collect-styles.ts)

```typescript
// 递归遍历模块依赖树，收集所有 CSS 文件
async function findModuleDependencies(
  vite: DevEnvironment,
  file: string,
  deps: Set<EnvironmentModuleNode>,
  crawledFiles = new Set<string>(),
  importer?: string
) {
  const module = await getViteModuleNode(vite, file, importer);
  if (!module?.id || deps.has(module)) return;
  deps.add(module);
  if (module.url.endsWith('.css') || module.url.includes('node_modules'))
    return;

  if (!module.transformResult?.deps) return;
  // 依赖 transformResult.deps 而非 importedModules，
  // 正确区分静态和动态导入，跳过动态导入的样式
  for (const dep of module.transformResult.deps) {
    if (crawledFiles.has(dep)) continue;
    await findModuleDependencies(vite, dep, deps, crawledFiles, module.id);
  }
}

export async function findStylesInModuleGraph(
  vite: DevEnvironment,
  id: string
) {
  const dependencies = new Set<EnvironmentModuleNode>();
  await findModuleDependencies(vite, absolute, dependencies);
  const styles: Record<string, any> = {};
  for (const dep of dependencies) {
    if (dep.id && isCssFile(dep.url)) {
      styles[dep.id] = dep.url;
    }
  }
  return styles;
}
```

#### 开发模式：CSS 内联为 `<style>` 标签

- **文件**：[packages/start/src/config/manifest.ts](https://github.com/solidjs/solid-start/blob/ec1b82bb1ff37d1d7969466404173517490c459d/packages/start/src/config/manifest.ts)

```typescript
// 在 Vite 插件的 load 钩子中，将收集到的 CSS 转为 <style> 标签
if (urlPath.endsWith('assets')) {
  const env = devServer.environments['ssr'];
  const styles = await findStylesInModuleGraph(env, id);

  const cssAssets = Object.entries(styles).map(
    ([key, value]) => `{
      tag: "style",
      attrs: {
        type: "text/css",
        "data-vite-dev-id": "${wrapId(key)}",
        "data-vite-ref": "0",
      },
      children: () => import("${wrapId(value)}?inline").then(mod => mod.default),
    }`
  );

  return `export default [${cssAssets.join(',')}]`;
}
```

#### 生产模式：从 Vite manifest 收集 CSS

- **文件**：[packages/start/src/server/manifest/prod-ssr-manifest.ts](https://github.com/solidjs/solid-start/blob/ec1b82bb1ff37d1d7969466404173517490c459d/packages/start/src/server/manifest/prod-ssr-manifest.ts)

```typescript
// 递归遍历 Vite manifest 的 imports 链，收集所有 CSS 文件
function findAssetsInViteManifest(
  manifest: Manifest, id: string,
  assetMap = new Map(), stack: string[] = [],
) {
  const chunk = manifest[id];
  if (!chunk) return [];

  const assets = chunk.css?.filter(Boolean) || [];
  if (chunk.imports) {
    stack.push(id);
    for (let i = 0; i < chunk.imports.length; i++) {
      const importId = chunk.imports[i];
      // 排除 entry 的导入（避免冗余 CSS）
      if (!importId || (excludeEntryImports && entryImports.includes(importId))) continue;
      assets.push(...findAssetsInViteManifest(manifest, importId, assetMap, stack));
    }
    stack.pop();
  }
  assets.push(chunk.file);
  return Array.from(new Set(assets));
}

// CSS 文件转为 <link rel="stylesheet"> 标签
function createHtmlTagsForAssets(assets: string[]) {
  return assets
    .filter(asset => asset.endsWith(".css") || asset.endsWith(".js") || ...)
    .map<Asset>(asset => ({
      tag: "link",
      attrs: {
        href: "/" + asset,
        key: asset,
        ...(asset.endsWith(".css")
          ? { rel: "stylesheet" }
          : { rel: "modulepreload" }),
      },
    }));
}
```

#### CSS 资产去重

- **文件**：[packages/start/src/server/assets/index.ts](https://github.com/solidjs/solid-start/blob/ec1b82bb1ff37d1d7969466404173517490c459d/packages/start/src/server/assets/index.ts)

```typescript
// 通过注册表对 CSS link 进行引用计数去重
const keyAttrs = ['href', 'rel', 'data-vite-dev-id'] as const;

const getEntity = (registry: Registry, asset: Asset) => {
  let key = asset.tag;
  for (const k of keyAttrs) {
    if (!(k in asset.attrs)) continue;
    key += `[${k}='${asset.attrs[k as keyof Asset['attrs']]}']`;
  }
  const entity = (registry[key] ??= { key, consumers: 0 });
  return entity;
};

// 组件卸载时减少引用计数，计数为 0 时移除 CSS link
onCleanup(() => {
  for (const key of cssKeys) {
    const entity = registry[key]!;
    entity.consumers--;
    if (entity.consumers != 0) continue;
    ssrRequestAssets.splice(entity.ssrIdx!, 1, NOOP);
    delete registry[key];
  }
});
```

### 设计要点

- **开发模式**：通过模块图遍历收集 CSS，内联为 `<style>` 标签（使用 `?inline` 查询参数）
- **生产模式**：从 Vite manifest 递归收集 CSS，渲染为 `<link>` 标签
- **引用计数去重**：通过资产注册表对 CSS link 进行引用计数，多个组件引用同一 CSS 时只渲染一次，组件卸载时自动清理
- **entry CSS 排除**：非 entry chunk 不重复渲染 entry 的 CSS

## 8. TanStack Router：构建时 CSS 内联 + 路由级 link 声明

**策略：构建时将 CSS 内容嵌入 manifest，运行时按路由匹配内联为 `<style>` 标签；支持 Early Hints 预加载**

TanStack Router（TanStack Start）实现了最完善的 CSS 内联策略，在构建阶段就将 CSS 内容收集到 manifest 中，运行时根据路由匹配动态决定内联还是使用 `<link>` 标签。

### 关键代码

#### 构建时：收集 CSS 内容到 manifest

- **文件**：[packages/start-plugin-core/src/start-manifest-plugin/manifestBuilder.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/start-plugin-core/src/start-manifest-plugin/manifestBuilder.ts)

```typescript
// 构建路由 manifest，为每个路由收集 CSS link
export function buildStartManifest(options: {
  clientBuild: NormalizedClientBuild
  routeTreeRoutes: RouteTreeRoutes
  basePath: string
  inlineCss?: InlineCssOptions  // { enabled: boolean, transformAssets: boolean }
  ...
}): StartManifest {
  // 扫描 client chunks，建立 routeFilePath → chunks 映射
  const scannedChunks = scanClientChunks(options.clientBuild);
  // 为每个路由收集 CSS（从 chunk 及其依赖中收集）
  const routes = buildRouteManifestRoutes({ ... });

  // 如果启用 inlineCss，将 CSS 内容嵌入 manifest
  if (options.inlineCss?.enabled) {
    result.inlineCss = buildInlineCssManifestData({
      routes,
      basePath: options.basePath,
      cssContentByFileName: options.clientBuild.cssContentByFileName,
      transformAssets: options.inlineCss.transformAssets,
    });
  }
  return result;
}

// 将 CSS 文件内容嵌入 manifest 的 inlineCss.styles 字段
function buildInlineCssManifestData(options: {
  routes: Record<string, RouteTreeRoute>
  cssContentByFileName: ReadonlyMap<string, string> | undefined
  ...
}): StartManifest['inlineCss'] {
  const stylesheetHrefs = new Set<string>();
  for (const route of Object.values(options.routes)) {
    for (const link of route.css ?? []) {
      stylesheetHrefs.add(getStylesheetHref(link));
    }
  }
  const styles: Record<string, string> = {};
  for (const [cssFile, css] of options.cssContentByFileName) {
    const cssHref = getAssetPath(cssFile);
    if (!stylesheetHrefs.has(cssHref)) continue;
    // 处理 CSS 中的 url() 引用（rebase 相对路径）
    const result = processInlineCssUrls({ css, cssHref, templates: ... });
    styles[cssHref] = result.css;
  }
  return { styles };
}
```

#### 运行时：按路由匹配内联 CSS

- **文件**：[packages/router-core/src/ssr/ssr-server.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/router-core/src/ssr/ssr-server.ts)

```typescript
// 根据匹配的路由，收集需要内联的 CSS href
function prepareMatchedManifestRoutes(
  manifest: ServerManifest,
  matches: Array<AnyRouteMatch>
): PreparedMatchedManifestRoutes {
  const inlineStyles = manifest.inlineCss?.styles;
  if (!inlineStyles) {
    // 未启用内联：直接返回路由的 CSS link
    return { routes, hasStrippedRoutes: false };
  }

  const inlineCssHrefs: Array<string> = [];
  for (const match of matches) {
    const route = manifest.routes[match.routeId];
    if (!route) continue;
    // 从路由的 css 数组中剥离已内联的样式表
    const nextRoute = stripInlinedStylesheetAssetsFromRoute(
      inlineStyles,
      route,
      inlineCssHrefs,
      seenInlineCssHrefs
    );
    routes[match.routeId] = nextRoute;
  }
  return { routes, hasStrippedRoutes: true, inlineCssHrefs };
}

// 将所有内联 CSS 合并为单个字符串
function getInlineCssForPreparedRoutes(
  manifest: ServerManifest,
  preparedRoutes: PreparedMatchedManifestRoutes
) {
  const styles = manifest.inlineCss?.styles;
  const hrefs = preparedRoutes.inlineCssHrefs;
  if (!styles || !hrefs?.length) return undefined;

  let css = '';
  for (const href of hrefs) {
    css += styles[href]!; // 合并所有匹配路由的 CSS
  }
  preparedRoutes.inlineCss = css;
  return css;
}
```

#### 运行时：CSS 内联选项解析

- **文件**：[packages/start-server-core/src/inlineCss.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/start-server-core/src/inlineCss.ts)

```typescript
export type HandlerInlineCssOption =
  | boolean
  | ((ctx: { request: Request }) => Awaitable<boolean>);

// 默认内联 CSS（当构建时启用了 inlineCss）
export function getStaticHandlerInlineCssDefault(
  handlerInlineCss: HandlerInlineCssOption | undefined
) {
  if (typeof handlerInlineCss === 'function') return undefined;
  return handlerInlineCss ?? true;
}

// 每个请求可动态决定是否内联 CSS
export async function resolveInlineCssForRequest(opts: {
  request: Request;
  handlerInlineCss: HandlerInlineCssOption | undefined;
  requestInlineCss: boolean | undefined;
}) {
  if (opts.requestInlineCss !== undefined) return opts.requestInlineCss;
  if (typeof opts.handlerInlineCss === 'function') {
    return await opts.handlerInlineCss({ request: opts.request });
  }
  return opts.handlerInlineCss ?? true;
}
```

#### Early Hints：CSS 预加载

- **文件**：[packages/start-server-core/src/early-hints.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/start-server-core/src/early-hints.ts)

```typescript
// 收集静态阶段的 Early Hints（manifest 中的 preloads 和 CSS）
export function collectStaticHintsFromManifest(
  manifest: ServerManifest,
  matchedRoutes: ReadonlyArray<AnyRoute>
): Array<EarlyHint> {
  const hints: Array<EarlyHint> = [];
  for (const route of matchedRoutes) {
    const routeManifest = manifest.routes[route.id];
    if (!routeManifest) continue;

    for (const link of routeManifest.css ?? []) {
      const stylesheetHref = getStylesheetHref(link);
      // 已内联的 CSS 跳过 Early Hints
      if (manifest.inlineCss?.styles[stylesheetHref] !== undefined) {
        continue;
      }
      hints.push({ href: stylesheetHref, rel: 'preload', as: 'style' });
    }
  }
  return hints;
}
```

#### CSS URL 处理

- **文件**：[packages/start-plugin-core/src/start-manifest-plugin/inlineCss.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/start-plugin-core/src/start-manifest-plugin/inlineCss.ts)

使用 `lightningcss` 处理内联 CSS 中的 `url()` 和 `@import` 引用，将相对路径 rebase 为正确的绝对路径，支持模板化以支持运行时 URL 转换（如 CDN 前缀）。

#### 开发模式：模块图遍历收集 CSS

- **文件**：[packages/start-plugin-core/src/vite/dev-server-plugin/dev-styles.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/start-plugin-core/src/vite/dev-server-plugin/dev-styles.ts)

与 React Router 7 和 SolidStart 类似，TanStack Router 在开发模式下也通过遍历 Vite 模块图收集 CSS。`collectDevStyles` 函数递归遍历匹配路由的模块依赖树，收集 CSS 内容并合并为带注释的字符串，内联为 `<style>` 标签。

### 设计要点

- **构建时收集**：CSS 内容在构建时从 client build 输出中收集，嵌入 manifest 的 `inlineCss.styles` 字段
- **路由级匹配**：运行时根据匹配的路由，从 manifest 中提取对应 CSS 内容并合并为单个字符串
- **剥离已内联的 link**：启用内联后，从路由的 `css` 数组中移除已内联的样式表，避免重复
- **每请求控制**：支持 `handlerInlineCss` 回调函数，每个请求可动态决定是否内联
- **Early Hints 集成**：未内联的 CSS 通过 103 Early Hints 预加载，已内联的 CSS 跳过
- **CSS URL rebase**：使用 `lightningcss` 处理内联 CSS 中的相对 URL
- **缓存策略**：内联和未内联的 manifest 分别缓存（`'inline-css'` 和 `'linked-css'` 两个缓存键，见 [packages/start-server-core/src/finalManifest.ts](https://github.com/TanStack/router/blob/ecbbd9a8ec1d2433382cd30d13b0764e504e91cf/packages/start-server-core/src/finalManifest.ts)），基于路由 ID 拼接的 cacheKey 做 LRU 缓存
- **开发模式**：通过 `dev-styles.ts` 遍历 Vite 模块图收集 CSS，与 React Router 7 / SolidStart 方案一致

## 对比总结

| 框架                | 策略                         | 合并/内联                                       | 构建时/运行时                                           | 导入顺序保护                  | 配置                                                    |
| ------------------- | ---------------------------- | ----------------------------------------------- | ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| **Next.js**         | CSS Chunk 合并               | 合并                                            | 构建时                                                  | 是（strict/loose/graph 模式） | `experimental.cssChunking`                              |
| **SvelteKit**       | CSS 内联 + bundleStrategy    | split 模式内联到 `<style>`；inline 模式全部内联 | 构建时收集 + 运行时合并                                 | 否（按文件粒度）              | `kit.inlineStyleThreshold`、`kit.output.bundleStrategy` |
| **Nuxt**            | CSS 内联                     | 内联到 `<style>`                                | 构建时跟踪 + SSR 内联（仅生产模式）                     | 否（按组件粒度）              | `features.inlineStyles`                                 |
| **Astro**           | CSS 传播/去重 + 大小阈值内联 | 小 CSS 内联，大 CSS 保留 link                   | 构建时（三个子插件）                                    | 是（order/depth 跟踪）        | `build.inlineStylesheets`                               |
| **Qwik**            | 禁用 code split + 内联       | 全局合并 + 组件内联                             | 构建时（cssCodeSplit=false，所有非 CSR 构建）+ SSR 内联 | 否（全局合并无需排序）        | 默认启用                                                |
| **React Router 7**  | 路由级收集 + 可选合并        | 可选合并（cssCodeSplit=false）                  | 构建时收集 + 开发时模块图遍历                           | 否                            | `build.cssCodeSplit`                                    |
| **SolidStart**      | Vite 原生 + 开发时内联       | 开发时内联，生产时 link                         | 生产时 manifest 收集 + 开发时模块图遍历                 | 否                            | 无                                                      |
| **TanStack Router** | 构建时内联                   | 内联到 `<style>`                                | 构建时收集 + 运行时路由匹配 + 开发时模块图遍历          | 否（按路由粒度）              | `server.build.inlineCss`                                |
| **本框架**          | 不合并                       | 每个 CSS 一个 `<link>`                          | N/A                                                     | N/A                           | N/A                                                     |

## 对本框架的可行性建议

### 1. CSS 合并方案（参考 Next.js）

**适用场景**：大型项目中有大量小 CSS 文件

**实现思路**：

- 在 Vite 构建完成后，后处理 manifest 中的 CSS 条目
- 将满足条件的小 CSS 文件合并为更大的 chunk
- 需要考虑导入顺序（CSS 顺序影响样式优先级）

**优点**：

- 减少 `<link>` 标签数量
- 保持 CSS 作为外部文件（可被浏览器缓存）

**挑战**：

- Vite/Rolldown 的 CSS code splitting 逻辑较难介入
- 需要正确处理 CSS 导入顺序
- 合并后可能影响缓存粒度（一个 CSS 变化导致整个 chunk 失效）

### 2. CSS 内联方案（参考 SvelteKit / TanStack Router）

**适用场景**：减少渲染阻塞请求，提升 LCP

**实现思路**：

- 在 [manifest-links.ts](file:///Users/tangbin/Git/web-widget/packages/vite-plugin/src/internal/manifest-links.ts) 的 `getLinks()` 中，对小于阈值的 CSS 文件改为内联
- 在 SSR 渲染时，将内联 CSS 合并到一个 `<style>` 标签中
- 对已内联的样式表添加 `disabled` 属性（SvelteKit 的做法）

**优点**：

- 实现相对简单（在 link 收集阶段即可处理）
- 消除渲染阻塞请求
- SvelteKit 的 `disabled` + `media="(max-width: 0)"` 技巧可防止 Vite 客户端重复加载

**挑战**：

- 内联 CSS 不可被浏览器缓存（每次页面请求都要重新传输）
- 需要处理 CSS 中的 `url()` 引用（相对路径问题）
- HTML 体积增大

**TanStack Router 的进阶做法**（可参考）：

- 构建时将 CSS 内容嵌入 manifest 的 `inlineCss.styles` 字段
- 运行时根据路由匹配，从 manifest 中提取对应 CSS 内容并合并为单个字符串
- 使用 `lightningcss` 处理内联 CSS 中的 `url()` 相对路径 rebase
- 支持每请求动态决定是否内联（`handlerInlineCss` 回调）
- 内联和未内联的 manifest 分别缓存

### 3. 禁用 CSS Code Splitting 方案（参考 Qwik）

**适用场景**：希望最简单地减少 `<link>` 数量

**实现思路**：

- 在 Vite 插件中设置 `build.cssCodeSplit = false`
- Vite 会将所有 CSS 打包成单个 `style.css` 文件
- 整个应用只有一个全局 CSS `<link>` 标签

**优点**：

- 实现最简单（一行配置）
- 彻底消除多个 `<link>` 标签的问题
- CSS 可被浏览器缓存

**挑战**：

- 所有路由的 CSS 合并在一起，首次加载可能加载不必要的样式
- 失去了 CSS 按路由拆分的优势
- 缓存粒度变粗（任何 CSS 变化导致整个文件失效）

### 4. 混合方案（推荐）

结合多种策略，**Astro 的 `inlineStylesheets: 'auto'` 已验证此方案的可行性**：

1. **小 CSS 内联**：小于阈值（如 4KB，参考 Astro 的 `assetsInlineLimit` 默认 4096 字节）的 CSS 文件内联到 `<style>` 标签
2. **大 CSS 保留 link**：大于阈值的 CSS 文件保留为外部 `<link>`，可被浏览器缓存
3. **共享 CSS 提取**：多个路由共享的 CSS 提取为单独的共享 chunk

这种方案可以在减少 `<link>` 数量的同时，平衡缓存效率和渲染性能。Astro 的实践表明，基于大小阈值的自动选择是可落地的混合策略。

### 5. 实现入口点

本框架的 CSS link 收集逻辑集中在以下文件：

- [manifest-links.ts](file:///Users/tangbin/Git/web-widget/packages/vite-plugin/src/internal/manifest-links.ts) — `getLinks()` 和 `getRouteMetaLinks()` 函数
- [collect-route-assets.ts](file:///Users/tangbin/Git/web-widget/packages/vite-plugin/src/internal/collect-route-assets.ts) — 路由模块资产图收集
- [server-assets-module.ts](file:///Users/tangbin/Git/web-widget/packages/vite-plugin/src/internal/server-assets-module.ts) — 预计算 link 列表

最直接的实现入口是在 `getLinks()` 函数中添加 CSS 内联逻辑，或在其调用方添加 CSS 合并后处理。

### 6. 各框架方案对比与选型建议

| 方案            | 参考框架             | 实现复杂度 | 缓存友好 | 减少请求数 | 推荐度 |
| --------------- | -------------------- | ---------- | -------- | ---------- | ------ |
| CSS Chunk 合并  | Next.js              | 高         | 是       | 部分       | 中     |
| CSS 内联        | SvelteKit / TanStack | 中         | 否       | 完全       | 高     |
| 禁用 code split | Qwik                 | 低         | 是       | 完全       | 中     |
| 混合方案        | Astro                | 中高       | 部分     | 大部分     | 高     |

**推荐**：优先实现混合方案（参考 Astro 的 `inlineStylesheets: 'auto'` 大小阈值自动选择），因为它在减少请求数和缓存效率之间取得了最佳平衡。对于需要更激进内联的场景，可参考 TanStack Router 的构建时收集 + 运行时路由匹配模式，该实现已验证了 `url()` rebase、每请求控制等边界情况的处理。
