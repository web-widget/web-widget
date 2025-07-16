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
# Unit tests
npm test

# Integration tests
cd ../../playgrounds/router
npm test
```

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
└── url.ts            # URL processing utilities
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
# Run all tests
npm test

# Type checking
npx tsc --noEmit

# Code style checking
npm run lint
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

```typescript
// ✅ Good tests
describe('Engine', () => {
  it('should process route modules correctly', async () => {
    // Arrange
    const engine = new Engine(mockOptions);
    const mockModule = createMockRouteModule();

    // Act
    const handler = await engine.processRoute();

    // Assert
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
```

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

## 🎯 Common Contribution Scenarios

### Scenario 1: Adding New Module Types

The framework provides clear extension points. If you want to support new module types:

1. **Define module interface** (`types.ts`)
2. **Add processing method in Engine** (`engine.ts`)
3. **Integrate in WebRouter** (`index.ts`)
4. **Add tests**
5. **Update documentation**

Extension examples:

- **Module type extension**: Add new processing methods in Engine
- **Middleware development**: Standard middleware patterns
- **Custom renderers**: Extend rendering options
- **Route handlers**: Custom route logic

### Scenario 2: Optimizing Rendering Performance

Rendering optimization typically involves:

1. **Cache strategy improvements** (`MODULE_CACHE` in `engine.ts`)
2. **Streaming rendering optimization** (`renderToResponse` method)
3. **Metadata processing optimization**

Performance optimization points:

- **Module caching**: WeakMap caches rendering functions
- **Streaming rendering**: Support progressive responses
- **Efficient routing**: Native URLPattern API
- **Lazy loading**: Support async module loading

### Scenario 3: Enhancing Error Handling

Error handling improvements may include:

1. **New error type support** (`transformHTTPException`)
2. **Error page template enhancements** (`fallback.ts`)
3. **Development tool improvements** (error stack, source maps)

### Scenario 4: Extending Middleware System

Middleware system extensions:

1. **Middleware lifecycle hooks**
2. **Middleware configuration options**
3. **Middleware composition patterns**

## 🧪 Testing Guide

### Unit Testing Strategy

```typescript
// Engine testing focus
describe('Engine', () => {
  describe('processRoute', () => {
    it('should handle sync modules', async () => {
      /* ... */
    });
    it('should handle async modules', async () => {
      /* ... */
    });
    it('should cache render functions', async () => {
      /* ... */
    });
  });

  describe('renderToResponse', () => {
    it('should render normal pages', async () => {
      /* ... */
    });
    it('should render error pages', async () => {
      /* ... */
    });
    it('should handle layout errors', async () => {
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

## 📚 Deep Learning

### Required Reading

1. **[README.md](./README.md)** - Project overview and quick start
2. **This document** - Complete contribution guide and architecture design

### Code Reading Path

Recommended reading order:

1. **`types.ts`** - Understand type definitions
2. **`context.ts`** - Learn about context objects
3. **`router.ts`** - Master route matching
4. **`engine.ts`** - 🌟 **Focus**: Core business logic
5. **`application.ts`** - HTTP layer processing
6. **`index.ts`** - Overall integration

### Practice Projects

Check actual usage examples in `playgrounds/router`:

- Route definition and processing
- Middleware usage
- Error page handling
- Streaming rendering

## ❓ Getting Help

### Common Questions

**Q: How to add new HTTP method support?**  
A: Add to the `METHODS` array in `application.ts`, the framework will automatically generate corresponding methods.

**Q: How to customize error pages?**  
A: Define custom error modules in the `fallbacks` of the manifest.

**Q: How to optimize rendering performance?**  
A: Check `MODULE_CACHE` usage, consider streaming rendering (`progressive: true`).

### Contact Us

- **GitHub Issues** - Report bugs or feature requests
- **Discussions** - Technical discussions and Q&A
- **Pull Request** - Direct code contributions

## 🎉 Contribution Recognition

All contributors will be recognized in the project! Thank you for helping web-router become better!

---

## 📋 Checklist

Before submitting a PR, please confirm:

- [ ] Code follows project standards
- [ ] Added necessary tests
- [ ] All tests pass
- [ ] Updated relevant documentation
- [ ] No TypeScript type errors
- [ ] Backward compatible (if applicable)

**Happy Coding! 🚀**
