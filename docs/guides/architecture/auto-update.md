# 容器化 >> 自动更新 || 40

Web Widget 应用推荐托管在 NPM 上，这使得可以直接使用公共 CDN 加载它。

## 使用公共 NPM CDN

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

## 搭建私有 NPM CDN

[unpkg](https://unpkg.com) 也是类似于 [jsdelivr](https://www.jsdelivr.com) 的公共 CDN，不同的是它开源了他的 NPM CDN 实现，当你需要给 CDN 增加一些额外的功能的时候，不妨基于它的开源方案部署一个属于自己的 CDN。