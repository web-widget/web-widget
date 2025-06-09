# Web Widget

[![CI](https://github.com/web-widget/web-widget/actions/workflows/test.yml/badge.svg?event=push)](https://github.com/web-widget/web-widget/actions/workflows/test.yml?query=event%3Apush)

A revolutionary web application framework designed to breathe new life into all frontend frameworks. It provides higher-level abstractions to control and integrate multiple frontend frameworks or tools, achieving truly technology-agnostic architecture.

> This project is currently in the preview stage, and the API is subject to significant changes at any time.

## Motivation

In many enterprises, technology stack lock-in is a common phenomenon. For instance, if a large project is initially built with Vue 2, upgrading to Vue 3 later may become a significant challenge. This project aims to introduce a scalable architecture. By doing so, it enables enterprises to gradually upgrade their UI framework versions or explore alternative frameworks, thereby continuously improving both the user experience and the developer experience.

## Core Features

### ⚡ Lightning Fast

- Use web streaming to accelerate page display
- Server-side components reduce client-side JS bundle size
- Streaming state transfer and selective hydration to reduce lag

### 🔄 Technology Stack Flexibility

- Framework-agnostic architecture that can drive React, Vue, and other UI frameworks simultaneously
- Provides performance optimization methods at a higher level
- Supports cross-framework component interoperability

### 🌐 Web Standards Compliant

- Designed to comply with [WinterCG](https://wintercg.org/) standards
- Can run in Node.js and Edge environments
- Client supports native ESM and Importmap
- Compatible with Chrome 67+

### 🔧 Enterprise-Ready Solution

- Solves technology stack lock-in problems
- Supports progressive framework upgrades
- Continuously improves user experience and developer experience

## Core Concepts

### Route Module

Route modules are server-side exclusive modules used for rendering HTML or handling other HTTP responses. Entry files are named with `*@route.*` suffix.

#### Basic Route Module

```tsx
// ./routes/index@route.tsx
import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from './components/BaseLayout';

export const meta = defineMeta({
  title: 'Home - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Welcome to Web Widget</h1>
      <p>This is a basic route module example</p>
    </BaseLayout>
  );
});
```

#### Dynamic Routes

```tsx
// ./routes/greet/[name]@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../components/BaseLayout';

export default defineRouteComponent(function Page(props) {
  const { name } = props.params;
  const url = new URL(props.request.url);
  const id = url.searchParams.get('id');

  return (
    <BaseLayout>
      <h1>Dynamic Routes</h1>
      <p>
        Greetings to you, {name}! ID: {id}
      </p>
    </BaseLayout>
  );
});
```

#### Data Fetching and Processing

```tsx
// ./routes/fetch@route.tsx
import {
  defineRouteComponent,
  defineRouteHandler,
  defineMeta,
} from '@web-widget/helpers';
import BaseLayout from '../components/BaseLayout';

interface PageData {
  items: Array<{ title: string; url: string }>;
}

async function fetchData(url: URL): Promise<PageData> {
  const response = await fetch(`${url.origin}/api/data`);
  return response.json();
}

export const meta = defineMeta({
  title: 'Data Fetching Example',
});

export const handler = defineRouteHandler<PageData>({
  async GET(ctx) {
    const data = await fetchData(new URL(ctx.request.url));

    const response = ctx.render({ data });
    response.headers.set('X-Custom-Header', 'Hello');

    return response;
  },
});

export default defineRouteComponent<PageData>(function Page({ data }) {
  return (
    <BaseLayout>
      <h1>Data Fetching</h1>
      <ul>
        {data.items.map((item, index) => (
          <li key={index}>
            <a href={item.url}>{item.title}</a>
          </li>
        ))}
      </ul>
    </BaseLayout>
  );
});
```

### Widget Module

Widget modules are intermediate component formats that support both server-side and client-side execution. Entry files are named with `*@widget.*` suffix.

#### React Widget

```tsx
// ./components/Counter@widget.tsx
import { useState } from 'react';
import styles from './Counter.module.css';

interface CounterProps {
  count: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.count);

  return (
    <div className={styles.counter}>
      <button onClick={() => setCount(count - 1)}>−</button>
      <span className={styles.count}>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

#### Vue Widget

```vue
<!-- ./components/Counter@widget.vue -->
<script setup lang="ts">
import { ref } from 'vue';

interface CounterProps {
  count: number;
}

const props = defineProps<CounterProps>();
const count = ref(props.count);
</script>

<template>
  <div class="counter">
    <button @click="count--">−</button>
    <span class="count">{{ count }}</span>
    <button @click="count++">+</button>
  </div>
</template>

<style scoped>
.counter {
  display: inline-block;
  line-height: 1em;
  padding: 15px;
  border-radius: 30px;
  font-size: 16px;
  border: 2px solid #42b883;
}
/* ... more styles */
</style>
```

#### Using Widgets in Routes

```tsx
// ./routes/index@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './components/BaseLayout';
import ReactCounter from './components/Counter@widget.tsx';
import VueCounter from './components/Counter@widget.vue';
import { toReact } from '@web-widget/vue';

const RVueCounter = toReact(VueCounter);

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Mixed Technology Stack Example</h1>

      <h2>React Component:</h2>
      <ReactCounter count={0} />

      <h2>Vue Component:</h2>
      <RVueCounter count={0} />
    </BaseLayout>
  );
});
```

### Route Configuration

Routes are configured through the `routemap.server.json` file:

```json
{
  "routes": [
    {
      "pathname": "/",
      "module": "./routes/index@route.tsx"
    },
    {
      "pathname": "/greet/:name",
      "module": "./routes/greet/[name]@route.tsx"
    },
    {
      "pathname": "/api/hello",
      "module": "./routes/api/hello@route.ts"
    }
  ],
  "middlewares": [],
  "actions": [],
  "fallbacks": []
}
```

## Advanced Features

### Error Handling

Web Widget provides comprehensive error handling with route-level fallbacks and global error boundaries.

```tsx
// ./routes/error-example@route.tsx
import {
  defineRouteHandler,
  defineRouteComponent,
  defineRouteFallbackComponent,
} from '@web-widget/helpers';
import { createHttpError } from '@web-widget/helpers/error';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const url = new URL(ctx.request.url);

    if (url.searchParams.has('404')) {
      // Render 404 component in current route
      return ctx.render({
        error: createHttpError(404, 'Page not found'),
      });
    }

    // Throw global error
    if (url.searchParams.has('global-error')) {
      throw createHttpError(404, 'Global error');
    }

    return ctx.render();
  },
});

// Route-level error fallback
export const fallback = defineRouteFallbackComponent(function Fallback(error) {
  return (
    <div>
      <h1>Error: {error.name}</h1>
      <p>{error.message}</p>
    </div>
  );
});

export default defineRouteComponent(function Page() {
  return (
    <div>
      <h1>Error Handling Example</h1>
      <a href="?404">Trigger 404 Error</a>
    </div>
  );
});
```

### Page Metadata Management

```tsx
// ./routes/meta@route.tsx
import {
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
  mergeMeta,
} from '@web-widget/helpers';
import BaseLayout from './components/BaseLayout';

export const meta = defineMeta({
  title: 'Meta Example',
  description: 'HTML Meta Data Example',
  meta: [
    {
      name: 'keywords',
      content: 'web-widget, meta, seo',
    },
    {
      property: 'og:title',
      content: 'Web Widget Meta Example',
    },
  ],
});

export const handler = defineRouteHandler({
  async GET(ctx) {
    const newMeta = mergeMeta(ctx.meta, {
      title: '😄 Dynamic Title!',
      meta: [
        {
          name: 'description',
          content: 'Dynamically generated description',
        },
      ],
    });

    return ctx.render({ meta: newMeta });
  },
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Page Metadata Example</h1>
      <p>View page source to see dynamically generated meta tags</p>
    </BaseLayout>
  );
});
```

### Data Caching

#### Async Cache in Vue 3 Components

```vue
<!-- ./components/GithubUser@widget.vue -->
<script setup lang="ts">
import { asyncCacheProvider } from '@web-widget/helpers/cache';
import { ref } from 'vue';

const props = defineProps({
  username: String,
});

const url = `https://api.github.com/users/${props.username}`;
const cacheKey = `github-user-${props.username}`;

const data = await asyncCacheProvider(cacheKey, async () => {
  console.log('Fetching user data...');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`);
  }
  const { name, location, avatar_url } = await response.json();
  return { name, location, avatar_url };
});

const show = ref(false);
</script>

<template>
  <div>
    <button @click="show = !show">
      {{ show ? 'Hide' : 'Show' }} GitHub User Info
    </button>
    <div v-show="show">
      <img :src="data.avatar_url" :alt="data.name" width="50" />
      <p>
        <strong>{{ data.name }}</strong>
      </p>
      <p>{{ data.location }}</p>
    </div>
  </div>
</template>
```

#### Sync Cache in React Components

```tsx
// ./components/UserProfile@widget.tsx
import { syncCacheProvider } from '@web-widget/helpers/cache';

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const data = syncCacheProvider(`user-${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`);
    const user = await response.json();
    return { id: user.id, name: user.name, email: user.email };
  });

  return (
    <div>
      <h3>{data.name}</h3>
      <p>{data.email}</p>
    </div>
  );
}
```

### Render Control

#### Client-Only Rendering

```tsx
// In route module
export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Client-Only Rendering Example</h1>
      <Counter renderStage="client" count={3} />
    </BaseLayout>
  );
});
```

#### Server-Only Rendering

```tsx
// In route module
export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Server-Only Rendering Example</h1>
      <StaticContent renderStage="server" data="static data" />
    </BaseLayout>
  );
});
```

### Navigation and Redirects

```tsx
// ./routes/redirect@route.tsx
import { defineRouteHandler } from '@web-widget/helpers';
import { redirect } from '@web-widget/helpers/navigation';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const url = new URL(ctx.request.url);

    if (url.searchParams.has('external')) {
      return redirect('https://www.example.com', 302);
    }

    return redirect('/home', 301);
  },
});
```

## File-System Routing

Web Widget supports file-system based routing conventions, automatically generating `routemap.server.json` during development.

### File Naming Rules

| File Name                       | Route Pattern          | Matching Paths             |
| ------------------------------- | ---------------------- | -------------------------- |
| `index@route.ts`                | `/`                    | `/`                        |
| `about@route.ts`                | `/about`               | `/about`                   |
| `blog/[slug]@route.ts`          | `/blog/:slug`          | `/blog/foo`, `/blog/bar`   |
| `blog/[slug]/comments@route.ts` | `/blog/:slug/comments` | `/blog/foo/comments`       |
| `old/[...path]@route.ts`        | `/old/:path*`          | `/old/foo`, `/old/bar/baz` |
| `[[lang]]/index@route.ts`       | `/{/:lang}?`           | `/`, `/en`, `/zh-cn`       |

### Route Groups

Create route groups using parentheses-wrapped folder names:

```
└── routes
    ├── (middlewares)
    │   └── [...all]@middleware.ts # -> /:all*
    ├── (vue2)
    │   ├── package.json
    │   └── marketing@route.vue    # -> /marketing
    └── (vue3)
        ├── package.json
        └── info@route.vue         # -> /info
```

## Web Standards APIs

Web Widget provides complete Web Standards API support in Node.js environment, following [WinterCG (TC55)](https://wintertc.org) specifications.

### Network APIs

- `fetch`, `Request`, `Response`, `Headers`
- `URLSearchParams`, `FormData`, `File`, `Blob`
- `WebSocket`

### Encoding APIs

- `TextDecoder`, `TextEncoder`
- `atob`, `btoa`

### Stream APIs

- `ReadableStream`, `WritableStream`, `TransformStream`

### Crypto APIs

- `crypto`, `CryptoKey`, `SubtleCrypto`

### Other Standard APIs

- `AbortController`, `DOMException`
- `structuredClone`, `URLPattern`

## Project Setup

### Basic Project Structure

```
my-web-widget-app/
├── routes/
│   ├── (components)/
│   │   ├── BaseLayout.tsx
│   │   ├── Counter@widget.tsx
│   │   └── Counter@widget.vue
│   ├── index@route.tsx
│   ├── about@route.tsx
│   └── api/
│       └── hello@route.ts
├── public/
├── entry.client.ts
├── entry.server.ts
├── routemap.server.json
├── importmap.client.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Package Dependencies

```json
{
  "dependencies": {
    "@web-widget/helpers": "^1.59.0",
    "@web-widget/html": "^1.59.0",
    "@web-widget/node": "^1.59.0",
    "@web-widget/react": "^1.59.0",
    "@web-widget/vue": "^1.59.0",
    "@web-widget/web-router": "^1.59.0",
    "@web-widget/web-widget": "^1.59.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vue": "^3.4.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.1.1",
    "@vitejs/plugin-vue": "^5.0.0",
    "@web-widget/vite-plugin": "^1.59.0",
    "vite": "^5.4.19"
  }
}
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## File Description

- `routes/**/*@route.*` Route modules that only run on the server side
- `routes/**/*@middleware.*` Middleware that only runs on the server side
- `routes/**/*@widget.*` Components that can interact with users, running simultaneously on both server and client sides
- `entry.client.ts` Client entry point
- `entry.server.ts` Server entry point
- `importmap.client.json` Client's import mapping configuration file
- `routemap.server.json` Routing configuration file, automatically generated by development tools

## Examples

| Name                      | Description                                                                            | Try Online                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [React](./examples/react) | Use **React** to render pages and load interactive components of **Vue** and **React** | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/react) |
| [Vue](./examples/vue)     | Use **Vue** to render pages and load interactive components of **React** and **Vue**   | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/vue)   |

## Best Practices

1. **Technology Stack Isolation**: Use widget modules to achieve isolation of different technology stack components
2. **Progressive Enhancement**: Prioritize server-side rendering, add client-side interaction as needed
3. **Caching Strategy**: Use lifecycle caching wisely to improve performance
4. **Error Handling**: Implement comprehensive error boundaries and fallback solutions
5. **Type Safety**: Make full use of TypeScript's type system

## Who Uses This

- <https://www.insmind.com> Use **React** to render pages and load interactive components of **Vue3** and **Vue2**
- <https://www.gaoding.com> Use **React** to render pages and load interactive components of **Vue2** and **Lit**

## Open in the Cloud

Click any of the buttons below to start a new development environment to demo or contribute to the codebase without having to install anything on your machine:

[![Open in VS Code](https://img.shields.io/badge/Open%20in-VS%20Code-blue?logo=visualstudiocode)](https://vscode.dev/github/web-widget/web-widget/tree/main/examples/)
[![Open in Glitch](https://img.shields.io/badge/Open%20in-Glitch-blue?logo=glitch)](https://glitch.com/edit/#!/import/github/web-widget/web-widget/tree/main/examples/)
[![Open in GitHub Codespaces](https://img.shields.io/badge/Open%20in-GitHub%20Codespaces-black?logo=github)](https://codespaces.new/web-widget/web-widget/tree/main/examples/)
[![Edit in CodeSandbox](https://img.shields.io/badge/Edit%20in-CodeSandbox-blue?logo=codesandbox)](https://codesandbox.io/s/github/web-widget/web-widget/tree/main/examples/)
[![Open in Repl.it](https://img.shields.io/badge/Open%20in-Repl.it-orange?logo=replit)](https://replit.com/github/web-widget/web-widget/tree/main/examples/)
[![Open in Codeanywhere](https://img.shields.io/badge/Open%20in-Codeanywhere-blue?logo=codeanywhere)](https://app.codeanywhere.com/#https://github.com/web-widget/web-widget/tree/main/examples/)
[![Open in Gitpod](https://img.shields.io/badge/Open%20in-Gitpod-orange?logo=gitpod)](https://gitpod.io/#https://github.com/web-widget/web-widget/tree/main/examples/)

## Community & Support

- **GitHub**: https://github.com/web-widget/web-widget
- **Issues**: https://github.com/web-widget/web-widget/issues

---

Web Widget framework provides a new architectural approach for modern web development, enabling enterprises to continuously evolve and optimize their frontend architecture without being locked into specific technology stacks.
