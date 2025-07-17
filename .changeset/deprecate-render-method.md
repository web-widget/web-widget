---
'@web-widget/schema': minor
---

feat: deprecate render method in favor of html method

- Mark render() method as @deprecated in RouteContext interface
- Update comments to reference html() method instead of render()
- Mark renderOptions as @deprecated in favor of renderer
- Mark RouteRenderOptions as @deprecated in favor of ServerRenderOptions
- Remove @experimental tags from html() method and renderer property

This is a breaking change as the render() method is now deprecated and will be removed in a future version. Users should migrate to the html() method for better type safety and clearer API.
