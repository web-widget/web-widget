# Web Router - Router Implementations

This module provides multiple router implementations for the Web Router framework, each optimized for different use cases.

## Router Types

### URLPattern Router (`url-pattern`)

The default router implementation using the Web standard URLPattern API.

**Features:**

- Full URLPattern support including regex patterns, character classes, and groups
- Web standard compliance
- Good for routes with complex patterns

**Example:**

```typescript
import { createRouter } from '@web-widget/web-router';

const router = createRouter('url-pattern');
router.add('GET', '/users/{id}', handler);
router.add('GET', '/posts/\\d+', handler);
router.add('GET', '/search/[a-z]+', handler);
```

### Radix Tree Router (`radix-tree`)

High-performance router using Radix Tree algorithm, inspired by find-my-way.

**Features:**

- Excellent performance for large route sets
- Memory efficient
- Limited to basic parameter patterns (`:param`) and wildcards (`*`)

**Example:**

```typescript
import { createRouter } from '@web-widget/web-router';

const router = createRouter('radix-tree');
router.add('GET', '/users/:id', handler);
router.add('GET', '/posts/:slug', handler);
router.add('GET', '/files/*', handler);
```

## Usage

### Basic Usage

```typescript
import { createRouter } from '@web-widget/web-router';

// Create router with specific type
const router = createRouter('url-pattern');

// Add routes
router.add('GET', '/users/:id', handler);
router.add('POST', '/users', handler);

// Match routes
const result = router.match('GET', '/users/123');
// result: [[handler, { id: '123' }, '/users/:id']]
```

### Application Configuration

```typescript
import { Application } from '@web-widget/web-router';

const app = new Application({
  routerType: 'url-pattern', // Use URLPattern router
});

// Or specify a specific router
const app = new Application({
  routerType: 'radix-tree', // Use RadixTree for performance
});
```

## Router Comparison

| Feature                  | URLPattern      | RadixTree    |
| ------------------------ | --------------- | ------------ |
| URLPattern Features      | ✅ Full support | ❌ Limited   |
| Performance (Large Sets) | ⚠️ Good         | ✅ Excellent |
| Memory Usage             | ⚠️ Higher       | ✅ Lower     |
| Complexity Support       | ✅ High         | ❌ Low       |
| Web Standards            | ✅ Full         | ⚠️ Partial   |

## Performance Considerations

### When to Use Each Router

- **URLPattern Router**: Routes with regex patterns, character classes, or complex URLPattern features
- **RadixTree Router**: Large applications with many simple routes (>100 routes)

### Performance Tips

1. **Route Design**: Keep routes simple when possible for better performance
2. **Large Applications**: Consider RadixTree for applications with many routes

## API Reference

### `createRouter<T>(type: RouterType): Router<T>`

Creates a router instance of the specified type.

**Parameters:**

- `type`: Router type (`'url-pattern'`, `'radix-tree'`)

**Returns:**

- Router instance implementing the Router interface

### `getDefaultRouterType(): RouterType`

Returns the default router type (currently `'url-pattern'`).

### `isValidRouterType(type: string): type is RouterType`

Validates if a router type is supported.
