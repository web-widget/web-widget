# Contributing Guide - Web-Router

Welcome to contributing to the web-router project! This guide helps you quickly understand how to participate in project development.

## 🚀 Quick Start

### Environment Setup

```bash
# Clone the project
git clone https://github.com/web-widget/web-widget.git
cd web-widget

# Install dependencies
pnpm install

# Navigate to web-router directory
cd packages/web-router
```

### Running Tests

```bash
# Unit tests (using Vitest)
pnpm test

# Watch mode during development
pnpm run test:watch

# Coverage report
pnpm run test:coverage

# Integration tests
cd ../../playgrounds/router
pnpm test
```

### Test Infrastructure

The project uses **Vitest** with **@cloudflare/vitest-pool-workers** for optimal Cloudflare Workers environment compatibility:

- **Test runner**: Vitest (faster than Jest, better Workers support)
- **Configuration**: `vitest.config.ts`
- **Environment**: Cloudflare Workers runtime
- **Coverage**: 158 comprehensive tests with 100% ModuleRuntime method coverage

## 📐 Architecture Overview

web-router adopts **Domain-Driven Design** with core components:

```
┌─────────────┐    ┌────────────────┐    ┌─────────────────┐    ┌────────────┐
│ Application │───▶│ Router         │───▶│ ModuleRuntime          │───▶│ Context    │
│ HTTP Layer  │    │ Route Matching │    │ Business Module Runtime│    │ State Mgmt │
└─────────────┘    └────────────────┘    └─────────────────┘    └────────────┘
```

- **Application** (`application.ts`) - HTTP request/response lifecycle
- **Router** (`router.ts`) - URL pattern matching and route registration
- **ModuleRuntime** (`module.ts`) - 🌟 **Core**: Unified business processing engine
- **Context** (`context.ts`) - Enhanced request context

> 💡 **Key Point**: ModuleRuntime is the core component responsible for module processing, rendering pipeline, and error handling

### Module Format Standard

web-router follows the **`@web-widget/schema`** specifications, which define a technology-agnostic module format standard for web applications. This ensures consistency, interoperability, and type safety across the entire framework.

**Key Module Types:**

- **Route Modules** (`RouteModule`) - Handle HTTP requests and render pages
- **Middleware Modules** (`MiddlewareModule`) - Process requests and modify context
- **Action Modules** (`ActionModule`) - Server-side functions callable from client (JSON-RPC)

**Standard Benefits:**

- **Type Safety** - Comprehensive TypeScript definitions ensure compile-time type checking
- **Framework Agnostic** - Module format works across different frontend technologies
- **Web Standards Compliance** - Built on Fetch API, ReadableStream, and standard HTTP methods
- **Consistent Interface** - All modules follow the same structure and patterns

**Example Module Structure:**

```typescript
// Route Module following @web-widget/schema
interface RouteModule {
  handler?: RouteHandler | RouteHandlers; // HTTP method handlers
  render?: ServerRender; // Server-side rendering function
  meta?: Meta; // HTML head metadata
  default?: RouteComponent; // Component reference
}
```

> 📋 **Reference**: See `packages/schema/README.md` for complete module format specifications and type definitions.

### Design Principles

- **Standardized Module Format** - Follows `@web-widget/schema` specifications for technology-agnostic module definitions
- **Domain-Driven Design** - Use clear domain objects instead of functional composition
- **Unified Processing Pipeline** - All requests (normal/error) go through consistent processing flow
- **Single Responsibility** - Each component has clear responsibility boundaries
- **Backward Compatibility** - Maintain existing API unchanged
- **Comprehensive Testing** - 100% method coverage with enterprise-level test quality

### File Structure

```
packages/web-router/src/
├── index.ts          # Entry file, WebRouter class definition
├── application.ts    # Application domain object
├── router.ts         # Router domain object
├── module.ts         # ModuleRuntime domain object (core)
├── context.ts        # Context domain object
├── types.ts          # TypeScript type definitions
├── layout.ts         # Default layout module
├── fallback.ts       # Default error page module
├── url.ts            # URL processing utilities
└── vitest.config.ts  # Vitest configuration for Cloudflare Workers
```

### Data Flow

#### Request Processing Flow

1. **HTTP Request** → Application receives request
2. **Route Matching** → Router matches route patterns
3. **Context Creation** → Create request context
4. **Module Processing** → ModuleRuntime processes modules (Route/Middleware/Action)
5. **Render Pipeline** → Unified rendering pipeline processing
6. **HTTP Response** → Return response

#### Module Types

- **Route Module**: Page route handlers
- **Middleware Module**: Middleware handlers
- **Action Module**: RPC action handlers

#### Rendering Pipeline

All response types (200/404/500) use unified rendering flow:

```
Handler → render() → ModuleRuntime → Layout → Response
```

### Key Design Decisions

#### 1. Unified Rendering Pipeline

Let normal pages and error pages use the same rendering flow, ensuring consistent user experience and shared layout system.

#### 2. ModuleRuntime Pattern

Centralized management of module processing, caching mechanisms, and error handling, avoiding code duplication and providing consistent processing interfaces.

#### 3. Caching Mechanism

Use WeakMap to cache module rendering functions, disable caching in development mode to support hot reload, enable caching in production mode to improve performance.

#### 4. Error Handling

Unified error handling flow, support custom error pages, differentiated display for development/production environments.

#### 5. Test Infrastructure Modernization

Migration to Vitest provides:

- **3-5x faster** test execution compared to Jest
- **Native Cloudflare Workers** environment support
- **Better TypeScript** integration and error reporting
- **Modern testing features** like async/await throughout

## 🔧 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Development...
# Testing...

# Commit code
git add .
git commit -m "feat: add your feature description"
```

### 2. Test Verification

```bash
# Run all tests (158 comprehensive tests)
pnpm test

# Watch mode for TDD
pnpm run test:watch

# Type checking
npx tsc --noEmit

# Code style checking
pnpm run lint

# Coverage report (verify 100% ModuleRuntime coverage)
pnpm run test:coverage
```

### 3. Submit PR

1. Push to your branch
2. Create Pull Request
3. Wait for code review
4. Modify based on feedback

## 📚 Deep Learning

### Required Reading

1. **[README.md](./README.md)** - Project overview and quick start
2. **[packages/schema/README.md](../schema/README.md)** - Module format standard specifications and type definitions
3. **This document** - Complete contribution guide and architecture design

### Code Reading Path

Recommended reading order:

1. **`types.ts`** - Understand type definitions
2. **`context.ts`** - Learn about context objects
3. **`router.ts`** - Master route matching
4. **`module.ts`** - 🌟 **Focus**: Core business logic
5. **`application.ts`** - HTTP layer processing
6. **`index.ts`** - Overall integration
7. **`*.test.ts`** - Study comprehensive test patterns

### Practice Projects

Check actual usage examples in `playgrounds/router`:

- Route definition and processing
- Middleware usage
- Error page handling
- Streaming rendering

## 🎉 Contribution Recognition

All contributors will be recognized in the project! Thank you for helping web-router become better!

---

## 📋 Checklist

Before submitting a PR, please confirm:

- [ ] Code follows project standards
- [ ] Added comprehensive tests (follow ModuleRuntime test pattern)
- [ ] All tests pass with Vitest
- [ ] Updated relevant documentation
- [ ] No TypeScript type errors
- [ ] Backward compatible (if applicable)
- [ ] Performance considerations addressed
- [ ] Cloudflare Workers compatibility maintained

**Happy Coding! 🚀**
