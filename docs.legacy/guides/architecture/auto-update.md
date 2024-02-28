# 深入 >> 更新应用 || 40

Web Widget 应用推荐托管在 NPM 上，你可以完全借助浏览器能力完成应用更新的工作，而不需要经过构建。有两种方法实现更新 Web Widget 应用：

- 使用 NPM CDN 提供的自动更新功能
- 使用[导入映射](import-maps.md)

你可以使用其中之一，也可以同时使用两者。它们的区别：

- NPM CDN 则可以完全由应用开发者来提供更新，但是因为 CDN 和浏览器都有缓存，所以难以保证以最快的方式更新版本
- 通过导入映射是最快的切换模块版本的方式，但是它需要依赖工程额外的版本管理服务或者硬编码到页面里，应用开发者无法直接通过 NPM 来更新版本

## 公共 NPM CDN

一些公共 CDN 提供了自动更新的机制，例如 [jsdelivr](https://www.jsdelivr.com)，你可以通过它实现 Web Widget 应用的自动升级。

### 总是自动更新到最新版本

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget"></web-widget>
```

### 仅更新 BUG 修复

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2"></web-widget>
```

### 使用固定的版本

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2.0.0"></web-widget>
```

### 搭建私有 NPM CDN

[unpkg](https://unpkg.com) 也是类似于 [jsdelivr](https://www.jsdelivr.com) 的公共 CDN，不同的是它开源了他的 NPM CDN 实现，当你需要给 CDN 增加一些额外的功能的时候，不妨基于它的开源方案部署一个属于自己的 CDN。

## 导入映射

请查看[部署导入映射](import-maps.md)了解细节。
