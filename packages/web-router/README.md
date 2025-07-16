# @web-widget/web-router

A server based on the Web standard.

## 📚 Documentation

- **[Contributing Guide](./CONTRIBUTING.md)** - Complete guide with architecture design and contribution workflow
- **[Refactoring Summary](./REFACTOR_SUMMARY.md)** - Architecture refactoring details and improvements
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

web-router uses **Domain-Driven Design** with clear separation of concerns:

- **Application** - HTTP request/response lifecycle management
- **Router** - URL pattern matching and route registration
- **Engine** - Core business logic and unified processing pipeline
- **Context** - Enhanced request state and rendering methods

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
