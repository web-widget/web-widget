# Web Widget

[![CI](https://github.com/web-widget/web-widget/actions/workflows/test.yml/badge.svg?event=push)](https://github.com/web-widget/web-widget/actions/workflows/test.yml?query=event%3Apush)
[![npm version](https://img.shields.io/npm/v/@web-widget/web-widget.svg)](https://www.npmjs.com/package/@web-widget/web-widget)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/web-widget/web-widget/branch/main/graph/badge.svg)](https://codecov.io/gh/web-widget/web-widget)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Deno](https://img.shields.io/badge/Deno-Compatible-brightgreen.svg)](https://deno.land/)
[![Bun](https://img.shields.io/badge/Bun-Compatible-orange.svg)](https://bun.sh/)
[![WinterCG](https://img.shields.io/badge/WinterCG-Compatible-blue.svg)](https://wintercg.org/)
[![RFC Compliant](https://img.shields.io/badge/RFC%207234-Compliant-green.svg)](https://tools.ietf.org/html/rfc7234)

> **🌟 Simple yet Powerful - A revolutionary meta-framework that seamlessly integrates multiple frontend technologies.**

Built on the philosophy of **"Simple yet Powerful"**, Web Widget breaks free from technology stack lock-in while maintaining elegant simplicity. Experience the power of running React, Vue, and other frameworks together with unprecedented ease.

> ⚠️ **Preview Release**: This project is in preview stage with API subject to changes.

## 💫 Design Philosophy: Simple yet Powerful

Web Widget is crafted with an unwavering commitment to being **"Simple yet Powerful"** - this is what sets it apart from every other framework:

### 🎯 **Simple by Design**

- **Two File Types**: Just `@route.*` and `@widget.*` - that's all you need to learn
- **Zero Configuration**: Works out of the box with intelligent defaults
- **Familiar Syntax**: Use the frameworks you already know and love
- **Intuitive APIs**: If it feels natural, it probably works

### ⚡ **Powerful by Nature**

- **Multi-Framework**: React, Vue, Svelte, Solid - all in one application
- **Web Standards**: Built on solid foundations that won't become obsolete
- **Enterprise Scale**: Powers production applications with millions of users
- **Future Proof**: Open architecture that evolves with the web platform

> _"The best technology is the one you don't have to think about"_ - This is our guiding principle.

## ✨ Why Web Widget?

**The Problem**: Enterprise applications often get locked into specific frameworks, making upgrades costly and risky.

**The Solution**: Web Widget provides a higher-level abstraction that lets you:

- 🔄 **Mix Technologies**: Use React and Vue components in the same application
- ⚡ **Upgrade Gradually**: Migrate frameworks incrementally without rewrites
- 🚀 **Performance First**: Server-side streaming and selective hydration
- 🌐 **Standards Based**: Built on Web Standards (WinterCG compliant)
- 🎯 **Stay Simple**: Complexity is hidden, power is revealed when needed

## 🚀 Quick Start

Experience the simplicity - get started in under 2 minutes:

```bash
# Create a new project
npx create-web-widget-app my-app
cd my-app

# Start development
npm run dev
```

**Or try online examples:**

| Example                   | Description                             | Live Demo                                                                                                                                                          |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [React](./examples/react) | React pages with React + Vue components | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/react) |
| [Vue](./examples/vue)     | Vue pages with React + Vue components   | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/vue)   |

## 🏗️ Core Architecture: Simplicity in Action

Web Widget's power comes from just two concepts - keeping it beautifully simple:

### 📄 Route Modules (`*@route.*`)

Server-side modules for rendering pages and handling HTTP requests.

```tsx
// routes/index@route.tsx - Simple, yet it can do everything
import { defineRouteComponent } from '@web-widget/helpers';
import Counter from './components/Counter@widget.tsx';

export default defineRouteComponent(function HomePage() {
  return (
    <html>
      <body>
        <h1>Welcome to Web Widget</h1>
        <Counter count={0} />
      </body>
    </html>
  );
});
```

### 🧩 Widget Modules (`*@widget.*`)

Isomorphic components that work on both server and client - the secret to our power.

```tsx
// components/Counter@widget.tsx (React) - Simple to write
import { useState } from 'react';

export default function Counter({ count }: { count: number }) {
  const [value, setValue] = useState(count);

  return (
    <div>
      <button onClick={() => setValue((v) => v - 1)}>-</button>
      <span>{value}</span>
      <button onClick={() => setValue((v) => v + 1)}>+</button>
    </div>
  );
}
```

```vue
<!-- components/Counter@widget.vue (Vue) - Just as simple -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ count: number }>();
const value = ref(props.count);
</script>

<template>
  <div>
    <button @click="value--">-</button>
    <span>{{ value }}</span>
    <button @click="value++">+</button>
  </div>
</template>
```

### 🔀 Cross-Framework Magic: Power Unleashed

The real power emerges when you effortlessly combine different frameworks:

```tsx
// Mix React and Vue in the same page - Simple syntax, powerful result
import ReactCounter from './Counter@widget.tsx';
import VueCounter from './Counter@widget.vue';
import { toReact } from '@web-widget/vue';

const VueCounterAsReact = toReact(VueCounter);

export default defineRouteComponent(function MixedPage() {
  return (
    <div>
      <h2>React Component:</h2>
      <ReactCounter count={0} />

      <h2>Vue Component (as React):</h2>
      <VueCounterAsReact count={0} />
    </div>
  );
});
```

## 🔥 Key Features: Where Simple Meets Powerful

### ⚡ **Lightning Fast Performance**

- **Streaming SSR**: Pages start rendering before all data is loaded
- **Selective Hydration**: Only interactive components hydrate on client
- **Optimized Bundles**: Server components reduce client-side JavaScript

### 🔄 **Technology Flexibility Without Complexity**

- **Framework Agnostic**: React, Vue, Svelte, Solid, and more
- **Progressive Migration**: Upgrade frameworks piece by piece
- **Component Interop**: Share components across different frameworks
- **No Lock-in**: Each component can use its preferred framework

### 🌐 **Web Standards First - Built to Last**

- **WinterCG Compatible**: Runs in Node.js, Deno, Bun, and Edge environments
- **ESM Native**: Modern module system with import maps
- **Web APIs**: Use standard fetch, streams, and crypto APIs everywhere
- **Future Proof**: Based on standards that won't become obsolete

### 🔧 **Enterprise Ready, Developer Friendly**

- **Type Safe**: Full TypeScript support out of the box
- **File-based Routing**: Intuitive routing with automatic route generation
- **Error Boundaries**: Comprehensive error handling and fallbacks
- **Zero Config**: Sensible defaults that just work

## 📁 Project Structure: Elegant Organization

```
my-web-widget-app/
├── routes/                    # Route modules (server-side)
│   ├── index@route.tsx       # → /
│   ├── about@route.tsx       # → /about
│   ├── blog/[slug]@route.tsx # → /blog/:slug
│   └── api/hello@route.ts    # → /api/hello
├── components/               # Shared components
│   ├── Layout.tsx           # Regular components
│   ├── Counter@widget.tsx   # React widget (isomorphic)
│   └── Timer@widget.vue     # Vue widget (isomorphic)
├── public/                  # Static files
├── entry.client.ts         # Client entry
├── entry.server.ts         # Server entry
└── package.json
```

_Simple structure, powerful capabilities._

## 📚 Learn More

<details>
<summary><strong>🛣️ Advanced Routing</strong></summary>

### Dynamic Routes

```tsx
// routes/users/[id]@route.tsx
export default defineRouteComponent(function UserPage(props) {
  const { id } = props.params;
  return <div>User ID: {id}</div>;
});
```

### Data Loading

```tsx
// routes/posts@route.tsx
export const handler = defineRouteHandler({
  async GET(ctx) {
    const posts = await fetchPosts();
    return ctx.render({ posts });
  },
});

export default defineRouteComponent(function PostsPage({ posts }) {
  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
});
```

### Nested Layouts

```tsx
// routes/(dashboard)/layout@route.tsx
export default defineRouteComponent(function DashboardLayout({ children }) {
  return (
    <div>
      <nav>Dashboard Navigation</nav>
      <main>{children}</main>
    </div>
  );
});
```

</details>

<details>
<summary><strong>🧩 Widget Advanced Features</strong></summary>

### Render Control

```tsx
// Server-only rendering
<StaticChart renderStage="server" data={chartData} />

// Client-only rendering
<InteractiveMap renderStage="client" location={coords} />
```

### Caching

```tsx
// Async cache in Vue components
const data = await asyncCacheProvider('cache-key', async () => {
  return await fetchExpensiveData();
});

// Sync cache in React components
const data = syncCacheProvider('cache-key', fetchData);
```

</details>

<details>
<summary><strong>🌐 Web Standards APIs</strong></summary>

Full Web Standards support in all environments:

- **Network**: `fetch`, `Request`, `Response`, `Headers`, `WebSocket`
- **Encoding**: `TextDecoder`, `TextEncoder`, `atob`, `btoa`
- **Streams**: `ReadableStream`, `WritableStream`, `TransformStream`
- **Crypto**: `crypto`, `CryptoKey`, `SubtleCrypto`
- **Other**: `AbortController`, `URLPattern`, `structuredClone`

</details>

## 🛠️ Development: As Simple as It Gets

Get up and running in seconds - because powerful tools should be easy to use:

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

_That's it. No complex configuration files, no setup wizards, no learning curve._

## 🌍 Real-World Usage: Proven in Production

**Simple to adopt, powerful in production** - Web Widget already powers applications serving millions of users:

- **[insmind.com](https://www.insmind.com)** - React pages with Vue 3 + Vue 2 components
  - _"Seamlessly integrated legacy Vue 2 components with modern Vue 3 features"_
- **[gaoding.com](https://www.gaoding.com)** - React pages with Vue 2 + Lit components
  - _"Migrated incrementally from Vue 2 to React without downtime"_

> These production deployments prove that our philosophy works: **complex enterprise challenges solved with elegant simplicity**.

## 🤝 Community

- **GitHub**: [web-widget/web-widget](https://github.com/web-widget/web-widget)
- **Issues**: [Report bugs or request features](https://github.com/web-widget/web-widget/issues)
- **Discussions**: [Join the community](https://github.com/web-widget/web-widget/discussions)

_Join developers who believe that powerful technology should be simple to use._

## 🚀 Try Online

[![Open in VS Code](https://img.shields.io/badge/Open%20in-VS%20Code-blue?logo=visualstudiocode)](https://vscode.dev/github/web-widget/web-widget/tree/main/examples/)
[![Open in GitHub Codespaces](https://img.shields.io/badge/Open%20in-GitHub%20Codespaces-black?logo=github)](https://codespaces.new/web-widget/web-widget/tree/main/examples/)
[![Edit in CodeSandbox](https://img.shields.io/badge/Edit%20in-CodeSandbox-blue?logo=codesandbox)](https://codesandbox.io/s/github/web-widget/web-widget/tree/main/examples/)
[![Open in Gitpod](https://img.shields.io/badge/Open%20in-Gitpod-orange?logo=gitpod)](https://gitpod.io/#https://github.com/web-widget/web-widget/tree/main/examples/)

---

## 📖 Detailed Documentation

<details>
<summary><strong>📋 Complete Route Module Examples</strong></summary>

### Basic Route Module

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

### Data Fetching and Processing

```tsx
// ./routes/fetch@route.tsx
import {
  defineRouteComponent,
  defineRouteHandler,
  defineMeta,
} from '@web-widget/helpers';
import BaseLayout from './components/BaseLayout';

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

</details>

<details>
<summary><strong>🧩 Complete Widget Examples</strong></summary>

### React Widget with Styles

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

### Vue Widget with Scoped Styles

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

.count {
  margin: 0 10px;
  font-weight: bold;
}

button {
  background: #42b883;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
}

button:hover {
  background: #369870;
}
</style>
```

### Using Widgets in Routes

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

</details>

<details>
<summary><strong>🔧 Advanced Features</strong></summary>

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
    // ...
    if (!data) {
      throw createHttpError(404, 'Not Found');
    }
    // ...
  },
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

</details>

<details>
<summary><strong>🗂️ File-System Routing</strong></summary>

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

</details>

<details>
<summary><strong>🏗️ Project Setup</strong></summary>

### Complete Project Structure

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

### File Description

- `routes/**/*@route.*` Route modules that only run on the server side
- `routes/**/*@middleware.*` Middleware that only runs on the server side
- `routes/**/*@widget.*` Components that can interact with users, running simultaneously on both server and client sides
- `entry.client.ts` Client entry point
- `entry.server.ts` Server entry point
- `importmap.client.json` Client's import mapping configuration file
- `routemap.server.json` Routing configuration file, automatically generated by development tools

</details>

<details>
<summary><strong>💡 Best Practices</strong></summary>

1. **Technology Stack Isolation**: Use widget modules to achieve isolation of different technology stack components
2. **Progressive Enhancement**: Prioritize server-side rendering, add client-side interaction as needed
3. **Caching Strategy**: Use lifecycle caching wisely to improve performance
4. **Error Handling**: Implement comprehensive error boundaries and fallback solutions
5. **Type Safety**: Make full use of TypeScript's type system

### Performance Tips

- Use `renderStage="server"` for static content that doesn't need interactivity
- Use `renderStage="client"` for components that require browser APIs
- Implement proper caching strategies for expensive operations
- Keep server components lightweight to improve SSR performance

### Code Organization

- Group related routes using parentheses folders
- Share common components through widget modules
- Use TypeScript interfaces for prop typing
- Implement proper error boundaries at route level

</details>

---

**Web Widget** embodies the principle that the most powerful technology is also the simplest to use. We've proven that breaking free from technology stack lock-in doesn't require complex solutions - it requires **elegant simplicity**.

> _"Simplicity is the ultimate sophistication"_ - Leonardo da Vinci

**Experience the freedom of choice. Embrace the power of simplicity. Build the future with Web Widget.**
