# 容器化 >> CDN || 40

Web Widget 应用推荐托管在 NPM 上，这使得可以直接使用公共 CDN 加载它。由于一些公共 CDN 提供了自动更新的机制，例如 [jsdelivr](https://www.jsdelivr.com)，你可以通过它实现 Web Widget 应用的自动升级。

## 始终让 Web Widget 应用保持最新版本

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget"></web-widget>
```

## 允许 Web Widget 应用修复 BUG

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2"></web-widget>
```

## 使用固定的版本

```html
<web-widget src="https://cdn.jsdelivr.net/npm/tabs-widget@2.0.0"></web-widget>
```