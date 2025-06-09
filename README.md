# Web Widget

[![CI](https://github.com/web-widget/web-widget/actions/workflows/test.yml/badge.svg?event=push)](https://github.com/web-widget/web-widget/actions/workflows/test.yml?query=event%3Apush)
[![npm version](https://img.shields.io/npm/v/@web-widget/web-widget.svg)](https://www.npmjs.com/package/@web-widget/web-widget)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/web-widget/web-widget/branch/main/graph/badge.svg)](https://codecov.io/gh/web-widget/web-widget)

> **🌟 Simple yet Powerful - Run React, Vue, and other frameworks together with unprecedented ease.**

Web Widget breaks free from technology stack lock-in while maintaining elegant simplicity. Built on **Web Standards** with **Zero Configuration** required.

> ⚠️ **Preview Release**: API subject to changes. Production ready.

## Table of Contents

- [Why Web Widget?](#-why-web-widget)
- [Quick Start](#-quick-start)
- [Core Concepts](#-core-concepts)
- [Key Features](#-key-features)
- [Real-World Usage](#-real-world-usage)
- [Documentation](#-documentation)
- [Community](#-community)

## 🎯 Why Web Widget?

**The Challenge**: Enterprise applications get locked into specific frameworks, making upgrades costly and risky.

**The Solution**: A meta-framework that provides:

- 🔄 **Mix Technologies**: Use React and Vue components in the same application
- ⚡ **Upgrade Gradually**: Migrate frameworks incrementally without rewrites
- 🚀 **Performance First**: Server-side streaming with selective hydration
- 🌐 **Web Standards**: Built on WinterCG-compliant foundations
- 🎯 **Stay Simple**: Two file types - that's all you need to learn

## 🚀 Quick Start

```bash
# Create a new project
npx create-web-widget-app my-app
cd my-app

# Start development
npm run dev
```

**Try online examples:**

| Framework                 | Description            | Demo                                                                                                                                                       |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [React](./examples/react) | React + Vue components | [![StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/react) |
| [Vue](./examples/vue)     | Vue + React components | [![StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/vue)   |

## 🏗️ Core Concepts

Web Widget's power comes from just **two file types**:

### 📄 Routes (`*@route.*`) - Server-side pages

```tsx
// routes/index@route.tsx
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

### 🧩 Widgets (`*@widget.*`) - Isomorphic components

**React Widget:**

```tsx
// components/Counter@widget.tsx
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

**Vue Widget:**

```vue
<!-- components/Counter@widget.vue -->
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

### 🔀 Cross-Framework Magic

Mix different frameworks effortlessly:

```tsx
// Mix React and Vue in the same page
import ReactCounter from './Counter@widget.tsx';
import VueCounter from './Counter@widget.vue';
import { toReact } from '@web-widget/vue';

const RVueCounter = toReact(VueCounter);

export default defineRouteComponent(function MixedPage() {
  return (
    <div>
      <h2>React Component:</h2>
      <ReactCounter count={0} />

      <h2>Vue Component (as React):</h2>
      <RVueCounter count={0} />
    </div>
  );
});
```

## ⚡ Key Features

### 🚀 **Performance**

- **Streaming SSR**: Pages start rendering before all data loads
- **Selective Hydration**: Only interactive components hydrate
- **Zero Hydration Errors**: End-to-end state caching
- **Standards-based Caching**: RFC 7234 compliant

### 🔄 **Technology Flexibility**

- **Multi-Framework**: React, Vue, Svelte, Solid support
- **Progressive Migration**: Upgrade piece by piece
- **Component Interop**: Share components across frameworks
- **No Lock-in**: Each component chooses its framework

### 🌐 **Web Standards**

- **WinterCG Compatible**: Node.js, Deno, Bun, Edge runtimes
- **ESM Native**: Modern modules with Import Maps
- **Production Module Sharing**: Optimized dependency loading
- **Future Proof**: Built on lasting web standards

### 🛠️ **Developer Experience**

- **Zero Configuration**: Works out of the box
- **File-based Routing**: Intuitive route generation
- **Full TypeScript**: Type safety throughout
- **Hot Reload**: Instant development feedback

## 📁 Project Structure

```
my-web-widget-app/
├── routes/                    # Server-side route modules
│   ├── index@route.tsx       # → /
│   ├── about@route.tsx       # → /about
│   └── blog/[slug]@route.tsx # → /blog/:slug
├── components/               # Shared components
│   ├── Layout.tsx           # Regular components
│   ├── Counter@widget.tsx   # React widget (isomorphic)
│   └── Timer@widget.vue     # Vue widget (isomorphic)
├── public/                  # Static files
├── entry.client.ts         # Client entry
├── entry.server.ts         # Server entry
└── package.json
```

## 🌍 Real-World Usage

**Production deployments serving millions of users:**

- **[insmind.com](https://www.insmind.com)** - React pages with Vue 3 + Vue 2 components
- **[gaoding.com](https://www.gaoding.com)** - React pages with Vue 2 + Lit components

> _"Complex enterprise challenges solved with elegant simplicity"_

## 📚 Documentation

### 📖 **Guides**

- [Getting Started Guide](./docs/getting-started.md)
- [Migration Guide](./docs/migration.md)
- [Deployment Guide](./docs/deployment.md)

### 📋 **API Reference**

- [Route Modules](./docs/api/routes.md)
- [Widget Components](./docs/api/widgets.md)
- [Helpers & Utilities](./docs/helpers/README.md)

### 🔧 **Advanced Topics**

- [Data Fetching & Caching](./docs/advanced/data-fetching.md)
- [Performance Optimization](./docs/advanced/performance.md)
- [Import Maps & Module Sharing](./docs/advanced/import-maps.md)
- [Cross-Framework Integration](./docs/advanced/framework-integration.md)

### 💡 **Examples & Recipes**

- [Common Patterns](./docs/examples/patterns.md)
- [Framework Migration](./docs/examples/migration.md)
- [Production Setups](./docs/examples/production.md)

## 🤝 Community

- **GitHub**: [web-widget/web-widget](https://github.com/web-widget/web-widget)
- **Issues**: [Report bugs or request features](https://github.com/web-widget/web-widget/issues)
- **Discussions**: [Join the community](https://github.com/web-widget/web-widget/discussions)

## 🚀 Try Online

[![Open in VS Code](https://img.shields.io/badge/Open%20in-VS%20Code-blue?logo=visualstudiocode)](https://vscode.dev/github/web-widget/web-widget/tree/main/examples/)
[![Open in GitHub Codespaces](https://img.shields.io/badge/Open%20in-GitHub%20Codespaces-black?logo=github)](https://codespaces.new/web-widget/web-widget/tree/main/examples/)
[![Edit in CodeSandbox](https://img.shields.io/badge/Edit%20in-CodeSandbox-blue?logo=codesandbox)](https://codesandbox.io/s/github/web-widget/web-widget/tree/main/examples/)

---

## ⚡ Advanced Features (Expandable Sections)

<details>
<summary><strong>🛣️ Advanced Routing & Data Fetching</strong></summary>

### Dynamic Routes with Data Loading

```tsx
// routes/users/[id]@route.tsx
import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const user = await fetchUser(ctx.params.id);
    return ctx.render({ user });
  },
});

export default defineRouteComponent(function UserPage({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
});
```

### Route Configuration

Routes are auto-generated from file structure, or configured via `routemap.server.json`:

```json
{
  "routes": [
    { "pathname": "/", "module": "./routes/index@route.tsx" },
    { "pathname": "/users/:id", "module": "./routes/users/[id]@route.tsx" }
  ]
}
```

</details>

<details>
<summary><strong>🎛️ Rendering Control & State Management</strong></summary>

### Selective Rendering

```tsx
// Server-only rendering
<StaticChart renderStage="server" data={chartData} />

// Client-only rendering
<InteractiveMap renderStage="client" location={coords} />
```

### Zero Hydration Errors with Cache Providers

```tsx
// Perfect server-client synchronization
function UserProfile({ userId }) {
  const user = syncCacheProvider(`user-${userId}`, () => fetchUser(userId));
  return <div>{user.name}</div>; // Identical on server and client
}
```

**Key Benefits:**

- ✅ Zero hydration mismatches
- ✅ Automatic data serialization
- ✅ Optimal performance
- ✅ Type-safe caching

</details>

<details>
<summary><strong>🌐 Production Module Sharing</strong></summary>

### Import Maps Configuration

```json
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "react-dom": "https://esm.sh/react-dom@18.2.0",
    "vue": "https://esm.sh/vue@3.4.8"
  }
}
```

### Performance Benefits

| Traditional Bundles   | Import Maps               |
| --------------------- | ------------------------- |
| ❌ Bundle duplication | ✅ Module sharing         |
| ❌ Vendor lock-in     | ✅ Web standards          |
| ❌ Large bundles      | ✅ Minimal app code       |
| ❌ Poor caching       | ✅ Browser-native caching |

**Browser Compatibility**: Native support in modern browsers with automatic polyfill for older ones.

</details>

<details>
<summary><strong>🔧 File-System Routing</strong></summary>

### Routing Conventions

| File Pattern              | Route         | Example Paths      |
| ------------------------- | ------------- | ------------------ |
| `index@route.ts`          | `/`           | `/`                |
| `about@route.ts`          | `/about`      | `/about`           |
| `blog/[slug]@route.ts`    | `/blog/:slug` | `/blog/hello`      |
| `[...path]@route.ts`      | `/:path*`     | `/any/nested/path` |
| `[[lang]]/index@route.ts` | `/{:lang}?`   | `/`, `/en`, `/zh`  |

### Route Groups

```
└── routes
    ├── (admin)         # Route group
    │   └── users@route.tsx    # → /users
    └── (api)           # Route group
        └── hello@route.ts     # → /hello
```

</details>

---

**Web Widget** embodies the principle that powerful technology should be simple to use. Experience the freedom of choice without the complexity.

> _"Simplicity is the ultimate sophistication"_ - Leonardo da Vinci

**Build the future with Web Widget - Simple, Powerful, Standards-based.**
