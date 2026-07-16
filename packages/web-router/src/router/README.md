# Router Internals

Web Router uses the Web standard `URLPattern` API with a compiled hybrid
matcher for common paths. Applications create it automatically.

```typescript
import WebRouter from '@web-widget/web-router';

const app = new WebRouter();
app.get('/users/:id', handler);
app.post('/users', handler);
```

Simple parameter routes use a compiled matcher. Larger buckets use a segment
trie, while regex, optional, and wildcard patterns retain exact URLPattern
matching behind a static-prefix index. Static routes are indexed directly.

The internal router keeps results in registration order when multiple routes
match. A custom implementation can still be provided through the existing
`router` application option when needed.
