# @web-widget/web-router

A server based on the Web standard.

## 📚 Documentation

- **[Contributing Guide](./CONTRIBUTING.md)** - Complete guide with architecture design and contribution workflow
- **[中文文档](./README.zh.md)** - Chinese documentation
- **[中文贡献指南](./CONTRIBUTING.zh.md)** - Chinese contributing guide

## 🚀 Quick Start

```typescript
import WebRouter from '@web-widget/web-router';

const router = WebRouter.fromManifest({
  routes: [
    {
      pathname: '/hello',
      module: {
        handler: {
          GET() {
            return new Response('Hello World!');
          },
        },
      },
    },
  ],
});

// Handle requests
const response = await router.dispatch('http://localhost/hello');
```

## 🏗️ Architecture Overview

Web Router separates manifest assembly, HTTP dispatch, route matching, module
execution, rendering, and error handling:

- **WebRouter** assembles a manifest into the execution pipeline.
- **Application** owns the HTTP lifecycle, middleware dispatch, and rewrite.
- **URLPatternRouter** performs compiled route matching.
- **ModuleRuntime** coordinates module loading, activation, handlers, and rendering.
- **Context** owns request-scoped state and background tasks.
- **Error handling** normalizes thrown values and routes them to fallback modules.

See the [Contributing Guide](./CONTRIBUTING.md) for responsibility boundaries,
request and error flow diagrams, cache ownership, and the internal module layout.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Setting up the development environment
- Code standards and best practices
- Testing strategies
- Common contribution scenarios

The Contributing Guide includes detailed architecture information and design principles.

## 🙏 Acknowledgments

The web-router project is inspired by:

- [Fresh](https://fresh.deno.dev)
- [Hono](https://hono.dev)
