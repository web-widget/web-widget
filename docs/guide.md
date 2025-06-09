# Web Widget Meta-Framework Guide

Web Widget is a meta-framework that provides higher-level abstractions for controlling and integrating various frontend frameworks and tools. Initially designed for embedding components of different technology stacks in NoCode editors, Web Widget has evolved into a meta-framework by extending widget abstractions to the server side.

## Features

- Works as an SSR development framework, collaborating with modern build tools like Vite
- Technology stack-neutral architecture that can integrate React, Vue, and other frontend UI frameworks while providing interoperability between components of different technology stacks
- Default server-side routing with customizable integration of client-side routing from other frontend frameworks
- Progressive streaming rendering on the server without waiting for all data to be ready; streaming loading and hydration of components on the client
- Provides Web Worker standard API support for Node.js and client-side Importmap support
- Offers middleware integration capabilities with frameworks like Koa for integration into existing BFF infrastructure; can also be used independently as a web framework for lightweight web business development
- Provides module extension capabilities, allowing the definition of business development frameworks on its foundation: custom exports from routing modules can form an extension system with middleware

## Core Concepts

In SSR business code driven by the meta-framework, most code revolves around three concepts: routing modules, widget modules, and Web standards.

### Routing Modules

Routing modules are typically used for rendering HTML or handling other HTTP responses. They work exclusively on the server side, and their **entry points** are named with `*@route.*`.

A simple routing module example:

```tsx
// ./routes/hello/index@route.tsx
export default function Page() {
  return (
    <>
      <h1>Hello world</h1>
    </>
  );
}
```

Then add the route configuration in `routemap.server.json` to make it effective:

```json
{
  "routes": [
    {
      "name": "Hello",
      "pathname": "/:lang/hello",
      "module": "./routes/hello/index@route.tsx"
    }
  ]
}
```

> The `pathname` syntax can refer to [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern).
>
> If file system routing is enabled, this file will be automatically generated during development.

Example of adding a page title:

```tsx
import { defineMeta } from '@web-widget/helpers';
export const meta = defineMeta({
  title: 'Hello',
});

export default function Page() {
  return (
    <>
      <h1>Hello world</h1>
    </>
  );
}
```

Example of dynamically modifying page title:

```tsx
import { mergeMeta, defineRouteHandler } from '@web-widget/helpers';

export const handler = defineRouteHandler({
  async GET(ctx) {
    const { title } = await fetchMeta();
    const meta = mergeMeta(ctx.meta, {
      title,
    });
    return ctx.render({
      meta,
    });
  },
});
```

### Widget Modules

Widget modules are an intermediate format for components that support running on both server and client sides by default. Their **entry points** are named with `*@widget.*`.

Example of embedding a widget module in a routing module:

```tsx
import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../../components/BaseLayout';
import App from './App@widget.vue';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Vue router</h1>
      <App />
    </BaseLayout>
  );
});
```

Typically, you only need to name existing Vue components as `*@widget.vue` or React components as `*@widget.jsx`, and the build tool will automatically convert them into the intermediate component format for embedding in routing modules.

Key features of widget modules:

- When embedded in routing modules, they support server-side rendering and can be independently hydrated on the client side to reduce lag
- Widgets are loaded asynchronously (converted to async imports by the build tool)
- When embedded in JSX-developed routing modules, they can utilize [React Suspense](https://react.dev/reference/react/Suspense) to provide progressive streaming rendering for faster page display
- The intermediate format enables interoperability between frameworks, allowing React components to embed Vue components and vice versa

### Web Standards

The meta-framework uses Web standard APIs like Fetch to build the server, and the Node.js global context is injected with Web standard APIs defined by [WinterTC (TC55)](https://wintertc.org). These global objects can be used directly in business code.

Using only Web standards to write server-side code ensures that the business can be migrated to platforms like Cloudflare Workers (currently gaoding.com uses Alibaba Cloud DCDN).

## File System Routing

The Web Widget meta-framework doesn't depend on file system routing to work. Enabling file system routing only automatically updates the `routemap.server.json` file during development. This file is essential for the framework, can be version controlled, and is subject to Code Review.

File names are mapped to route patterns as follows:

- Files containing `*@route.*` and `*@middleware.*` suffixes will participate in route matching
- File extensions are ignored
- Literals in the file path are treated as string literals to match
- Files named `<path>/index.<ext>` behave identically to a file named `<path>.<ext>`
- Path segments can be made dynamic by surrounding an identifier with `[` and `]`
- Paths where the last path segment follows the structure `[...<ident>]` are treated as having a wildcard suffix

### Route Groups

A route group is a folder with a name wrapped in braces. For example, `(pages)` or `(marketing)`. This allows grouping related routes in folders and using different dependencies for each group.

```txt
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

## Helper Methods

`@web-widget/helpers` exposes some commonly used helper methods that can read and write SSR context. Most methods can work simultaneously on the server side, client side, and across different technology stacks.

For detailed documentation of helper methods, please refer to [@web-widget/helpers documentation](./helpers/README.md).
