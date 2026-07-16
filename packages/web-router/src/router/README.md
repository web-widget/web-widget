# Web Router

The router uses the Web standard `URLPattern` API with a compiled hybrid
matcher for common paths.

```typescript
import { createRouter } from '@web-widget/web-router';

const router = createRouter();
router.add('GET', '/users/:id', handler);
router.add('POST', '/users', handler);

const result = router.match('GET', '/users/123');
// [[handler, { id: '123' }, '/users/:id']]
```

Simple parameter routes use a compiled matcher. Larger buckets use a segment
trie, while regex, optional, and wildcard patterns retain exact URLPattern
matching behind a static-prefix index. Static routes are indexed directly.

Applications use this router by default. A custom implementation can still be
provided through `Application`'s `router` option when needed.

## API

### `createRouter<T>(): Router<T>`

Creates the compiled URLPattern router.

### `URLPatternRouter<T>`

The concrete router implementation. It supports URLPattern patterns and keeps
results in registration order when multiple routes match.
