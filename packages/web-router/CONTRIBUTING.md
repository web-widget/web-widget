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
- **Coverage**: 158 comprehensive tests with 100% Engine method coverage

## 📐 Architecture Overview

web-router adopts **Domain-Driven Design** with core components:

```
┌─────────────┐    ┌────────────────┐    ┌─────────────────┐    ┌────────────┐
│ Application │───▶│ Router         │───▶│ Engine          │───▶│ Context    │
│ HTTP Layer  │    │ Route Matching │    │ Business Engine │    │ State Mgmt │
└─────────────┘    └────────────────┘    └─────────────────┘    └────────────┘
```

- **Application** (`application.ts`) - HTTP request/response lifecycle
- **Router** (`router.ts`) - URL pattern matching and route registration
- **Engine** (`engine.ts`) - 🌟 **Core**: Unified business processing engine
- **Context** (`context.ts`) - Enhanced request context

> 💡 **Key Point**: Engine is the core component responsible for module processing, rendering pipeline, and error handling

### Design Principles

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
├── engine.ts         # Engine domain object (core)
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
4. **Module Processing** → Engine processes modules (Route/Middleware/Action)
5. **Render Pipeline** → Unified rendering pipeline processing
6. **HTTP Response** → Return response

#### Module Types

- **Route Module**: Page route handlers
- **Middleware Module**: Middleware handlers
- **Action Module**: RPC action handlers

#### Rendering Pipeline

All response types (200/404/500) use unified rendering flow:

```
Handler → render() → Engine → Layout → Response
```

### Key Design Decisions

#### 1. Unified Rendering Pipeline

Let normal pages and error pages use the same rendering flow, ensuring consistent user experience and shared layout system.

#### 2. Engine Pattern

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

# Coverage report (verify 100% Engine coverage)
pnpm run test:coverage
```

### 3. Submit PR

1. Push to your branch
2. Create Pull Request
3. Wait for code review
4. Modify based on feedback

## 📝 Code Standards

### TypeScript Standards

```typescript
// ✅ Good examples
interface MyModule {
  handler: MyHandler;
  config?: MyConfig;
}

class MyProcessor {
  async process(module: MyModule): Promise<MiddlewareHandler> {
    // Implementation...
  }
}

// ❌ Avoid these patterns
function processModule(module: any): any {
  // Lacks type safety
}
```

### Testing Standards

Use **Vitest** modern syntax and patterns:

```typescript
// ✅ Good tests with Vitest
import { describe, it, expect, vi } from 'vitest';

describe('Engine', () => {
  it('should process route modules correctly', async () => {
    // Arrange
    const engine = new Engine(mockOptions);
    const mockModule = createMockRouteModule();

    // Act
    const handler = await engine.createRouteHandler(mockModule);

    // Assert
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });

  it('should cache module handlers for performance', async () => {
    const engine = new Engine(mockOptions);
    const spy = vi.fn();

    // Verify caching behavior...
  });
});
```

### Test Coverage Requirements

- **Unit tests**: Cover all public methods
- **Integration tests**: Cover complete request flows
- **Error scenarios**: Cover all error paths
- **Caching verification**: Verify performance optimizations
- **Standards compliance**: Ensure Web API compatibility

### Documentation Standards

```typescript
/**
 * Process route module
 *
 * @param route - Route module or module loading function
 * @returns Middleware handler
 */
async processRoute(route: RouteModule | (() => Promise<RouteModule>)): Promise<MiddlewareHandler> {
  // Implementation...
}
```

## 🧪 Testing Guide

### Test Architecture Overview

**Current test metrics** (as of latest refactoring):

- **Total tests**: 158 comprehensive tests
- **Engine coverage**: 28 tests covering 100% of public methods
- **Test categories**: Route handling, middleware processing, action handling, error scenarios, caching verification

### Unit Testing Strategy

```typescript
// Engine testing focus - comprehensive coverage
describe('Engine', () => {
  describe('createRouteContextHandler', () => {
    it('should create route context with all properties', async () => {
      /* ... */
    });
  });

  describe('createMiddlewareHandler', () => {
    it('should handle basic middleware functionality', async () => {
      /* ... */
    });
    it('should handle async module loading', async () => {
      /* ... */
    });
    it('should handle errors gracefully', async () => {
      /* ... */
    });
    it('should cache handlers for performance', async () => {
      /* ... */
    });
  });

  describe('createActionHandler', () => {
    it('should process POST requests correctly', async () => {
      /* ... */
    });
    it('should return 405 for non-POST requests', async () => {
      /* ... */
    });
    it('should handle JSON-RPC protocol compliance', async () => {
      /* ... */
    });
  });

  describe('createErrorHandler', () => {
    it('should handle Error objects', async () => {
      /* ... */
    });
    it('should handle Response objects', async () => {
      /* ... */
    });
    it('should handle non-Error objects', async () => {
      /* ... */
    });
  });
});
```

### Integration Testing Strategy

```typescript
// Complete flow testing
describe('WebRouter Integration', () => {
  it('should handle complete request cycle', async () => {
    const router = WebRouter.fromManifest({
      routes: [{ pathname: '/test', module: testModule }],
    });

    const response = await router.dispatch('/test');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('expected content');
  });
});
```

### Vitest Configuration

Our `vitest.config.ts` is optimized for Cloudflare Workers:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: '@cloudflare/vitest-pool-workers',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
```

## 🔍 Debugging Tips

### Development Mode Debugging

```typescript
const router = WebRouter.fromManifest(manifest, {
  dev: true, // Enable development mode
  onFallback: (error, context) => {
    console.error('🚨 Error details:', {
      error: error.message,
      stack: error.stack,
      url: context?.request.url,
      method: context?.request.method,
    });
  },
});
```

### Performance Analysis

```typescript
// Add performance monitoring
const startTime = performance.now();
const response = await router.dispatch(request);
const endTime = performance.now();
console.log(`Request processed in ${endTime - startTime}ms`);
```

### Test Debugging with Vitest

```typescript
// Use Vitest debugging features
import { vi } from 'vitest';

// Mock console for cleaner test output
const consoleSpy = vi.spyOn(console, 'log');

// Debug test state
console.log('Current test state:', expect.getState());
```

## 📚 Deep Learning

### Required Reading

1. **[README.md](./README.md)** - Project overview and quick start
2. **[REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md)** - Detailed architecture refactoring documentation
3. **This document** - Complete contribution guide and architecture design

### Code Reading Path

Recommended reading order:

1. **`types.ts`** - Understand type definitions
2. **`context.ts`** - Learn about context objects
3. **`router.ts`** - Master route matching
4. **`engine.ts`** - 🌟 **Focus**: Core business logic
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
- [ ] Added comprehensive tests (follow Engine test pattern)
- [ ] All tests pass with Vitest
- [ ] Updated relevant documentation
- [ ] No TypeScript type errors
- [ ] Backward compatible (if applicable)
- [ ] Performance considerations addressed
- [ ] Cloudflare Workers compatibility maintained

**Happy Coding! 🚀**
