# Web Widget Meta-Framework Guide

Web Widget is a meta-framework that provides higher-level abstractions for controlling and integrating various frontend frameworks and tools. Initially designed for embedding components of different technology stacks in NoCode editors, Web Widget has evolved into a meta-framework by extending widget abstractions to the server side.

## Features

### Fast

- Use web streaming to accelerate page display
- Server-side components reduce client-side JS
- Streaming State and selective hydration to reduce lag

### Flexibility

- No new technology stack required
- Can drive UI technology stacks such as React and Vue simultaneously
- Provides performance optimization methods at a higher level

### Web Standards

- Complies with [WinterCG](https://wintercg.org/) standards
- Runs in Node.js and Edge environments
- Client supports native ESM and Importmap
- Compatible with Chrome 67+

### Technology Stack Interoperability

- Different technology stacks are isolated through component container technology
- React components can be embedded in Vue components
- Vue components can also introduce React components

## Getting Started

### Project Structure

A typical Web Widget project structure looks like this:

```txt
├── routes/                 # Route modules
│   ├── (middlewares)/     # Middleware route group
│   │   └── [...all]@middleware.ts
│   ├── (vue)/            # Vue route group
│   │   └── info@route.vue
│   └── (react)/          # React route group
│       └── hello@route.tsx
├── widgets/              # Widget modules
│   ├── Counter@widget.vue
│   └── App@widget.tsx
├── components/          # Shared components
│   └── BaseLayout.tsx
├── public/             # Static assets
├── entry.client.ts     # Client entry
├── entry.server.ts     # Server entry
├── routemap.server.json # Route configuration
└── vite.config.ts      # Build configuration
```

### Basic Setup

1. Install dependencies:

```bash
npm install @web-widget/core @web-widget/helpers
```

2. Configure Vite:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import webWidget from '@web-widget/vite';

export default defineConfig({
  plugins: [
    webWidget({
      // Enable file system routing in development
      fileSystemRouting: true,
    }),
  ],
});
```

3. Create a route module:

```tsx
// routes/hello@route.tsx
import { defineMeta } from '@web-widget/helpers';

export const meta = defineMeta({
  title: 'Hello World',
});

export default function Page() {
  return (
    <>
      <h1>Hello World</h1>
    </>
  );
}
```

4. Configure routes:

```json
// routemap.server.json
{
  "routes": [
    {
      "name": "Hello",
      "pathname": "/hello",
      "module": "./routes/hello@route.tsx"
    }
  ]
}
```

## Core Concepts

### Routing Modules

Routing modules are the foundation of server-side rendering in Web Widget. They handle HTTP requests and render HTML responses.

#### Basic Route Module

```tsx
// routes/hello@route.tsx
import { defineMeta } from '@web-widget/helpers';

export const meta = defineMeta({
  title: 'Hello World',
});

export default function Page() {
  return (
    <>
      <h1>Hello World</h1>
    </>
  );
}
```

#### Dynamic Route Module

```tsx
// routes/blog/[slug]@route.tsx
import { defineRouteHandler, defineRouteComponent } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const { slug } = ctx.params;
    const post = await fetchPost(slug);

    if (!post) {
      return ctx.render({
        error: { status: 404, message: 'Post not found' },
      });
    }

    return ctx.render({ data: post });
  },
});

export default defineRouteComponent(function Page({ data }) {
  return (
    <article>
      <h1>{data.title}</h1>
      <div>{data.content}</div>
    </article>
  );
});
```

### Widget Modules

Widget modules are components that can run on both server and client sides. They support multiple frameworks and can be embedded in routing modules.

#### Vue Widget Example

```vue
<!-- widgets/Counter@widget.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  initialCount?: number;
}>();

const count = ref(props.initialCount ?? 0);
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>
```

#### React Widget Example

```tsx
// widgets/App@widget.tsx
import { useState } from 'react';

export default function App({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

#### Using Widgets in Routes

```tsx
// routes/dashboard@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';
import VueCounter from '../widgets/Counter@widget.vue';
import ReactApp from '../widgets/App@widget.tsx';

export default defineRouteComponent(function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <VueCounter initialCount={5} />
      <ReactApp initialCount={10} />
    </div>
  );
});
```

### Web Standards

Web Widget uses standard Web APIs for both server and client-side code. This ensures compatibility across different environments.

#### Server-side Example

```ts
// routes/api@route.ts
import { defineRouteHandler } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();

    return ctx.render({ data });
  },
});
```

#### Client-side Example

```ts
// widgets/DataFetcher@widget.tsx
import { useEffect, useState } from 'react';

export default function DataFetcher() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>{JSON.stringify(data)}</div>;
}
```

## Best Practices

### Performance Optimization

1. Use streaming rendering for large pages:

```tsx
// routes/large-page@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';

export default defineRouteComponent(function Page() {
  return (
    <div>
      <h1>Large Page</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
});
```

2. Implement selective hydration:

```tsx
// routes/dashboard@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';
import InteractiveWidget from '../widgets/Interactive@widget.vue';

export default defineRouteComponent(function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <InteractiveWidget renderStage="client" />
    </div>
  );
});
```

### Error Handling

```tsx
// routes/error@route.tsx
import {
  defineRouteHandler,
  defineRouteComponent,
  defineRouteFallbackComponent,
} from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';

export const handler = defineRouteHandler({
  async GET(ctx) {
    try {
      const data = await fetchData();
      return ctx.render({ data });
    } catch (error) {
      return ctx.render({
        error: createHttpError(500, 'Internal Server Error'),
      });
    }
  },
});

export const fallback = defineRouteFallbackComponent(function ErrorPage({
  error,
}) {
  return (
    <div>
      <h1>Error: {error.status}</h1>
      <p>{error.message}</p>
    </div>
  );
});
```

### Data Fetching and Caching

```tsx
// routes/data@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';
import { cacheProvider } from '@web-widget/helpers/cache';

export default defineRouteComponent(function Page() {
  const data = cacheProvider('data-key', async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  });

  return <div>{JSON.stringify(data)}</div>;
});
```

## Advanced Topics

### Custom Middleware

```ts
// routes/(middlewares)/[...all]@middleware.ts
import { defineMiddleware } from '@web-widget/helpers';

export const handler = defineMiddleware({
  async handle(ctx, next) {
    // Add custom headers
    ctx.response.headers.set('X-Custom-Header', 'value');

    // Continue to next middleware or route
    return next();
  },
});
```

### Route Groups

Route groups allow organizing related routes and using different dependencies:

```txt
routes/
├── (marketing)/
│   ├── package.json        # Marketing-specific dependencies
│   └── home@route.tsx
└── (dashboard)/
    ├── package.json        # Dashboard-specific dependencies
    └── stats@route.tsx
```

## Helper Methods

`@web-widget/helpers` provides various utility functions for working with SSR context. For detailed documentation, please refer to [@web-widget/helpers documentation](./helpers/README.md).
