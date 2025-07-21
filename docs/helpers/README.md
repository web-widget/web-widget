# Web Widget Helpers

This directory contains helper functions and utilities for Web Widget applications.

## 📋 Documentation Format

Each helper function documentation follows this structure:

- **Purpose**: What the function does
- **Usage Examples**: Practical code examples
- **Environment**: Where it can be used (`server`, `client`, or both)
- **API**: Function signature and return values

## 🔧 Helper Categories

### Context & Navigation

- [`context`](./context.md) - Access route context information
- [`params`](./params.md) - Get dynamic route parameters
- [`searchParams`](./search-params.md) - Access URL query parameters
- [`url`](./url.md) - Get current URL information
- [`redirect`](./redirect.md) - Redirect to different routes

### HTTP Headers & Cookies

- [`headers`](./headers.md) - Access request/response headers
- [`cookies`](./cookies.md) - Handle HTTP cookies
- [`userAgent`](./user-agent.md) - Parse user agent information

### Caching & Performance

- [`cacheProvider`](./lifecycle-cache.md#cacheprovider) - Basic caching utilities
- [`syncCacheProvider`](./lifecycle-cache.md#synccacheprovider) - Synchronous cache provider
- [`lifecycleCache`](./lifecycle-cache.md#lifecyclecache) - Complete lifecycle caching

### Error Handling & Status

- [`HTTPException`](./http-exception.md) - HTTP error handling
- [`Status`](./status.md) - HTTP status codes and text

### Environment & Module Utilities

- `IS_CLIENT` - Check if running on client side
- `IS_SERVER` - Check if running on server side
- `defineConfig` - Define configuration
- `defineMeta` - Define page metadata
- `defineRender` - Define render function
- `defineRouteComponent` - Define route components
- `defineRouteFallbackComponent` - Define fallback components
- `defineRouteHandler` - Define route handlers
- `defineMiddlewareHandler` - Define middleware handlers
- `mergeMeta` - Merge metadata objects
- `renderMetaToString` - Convert metadata to string
- `composeMiddleware` - Compose middleware functions
