# Module Format Schema

A technology-agnostic module format standard that defines the structure and types for web application modules. This schema provides a foundation for building modular web applications with clear separation of concerns and consistent interfaces.

## Overview

This package defines TypeScript type definitions for a standardized module format that enables:

- **Route Modules**: Handle HTTP requests and render pages
- **Widget Modules**: Reusable components that work on both server and client
- **Action Modules**: Server-side functions callable from the client
- **Middleware Modules**: Request processing and context modification
- **HTTP Types**: Standard HTTP request/response handling
- **Metadata Types**: HTML document metadata management
- **Rendering Types**: Server-side and client-side rendering interfaces

## Module Types

### Route Modules

Route modules handle HTTP requests and define page endpoints. They can contain components, handlers, metadata, and rendering logic.

```typescript
interface RouteModule {
  config?: RouteConfig;
  default?: RouteComponent;
  fallback?: RouteFallbackComponent;
  handler?: RouteHandler | RouteHandlers;
  meta?: Meta;
  render?: ServerRender;
}
```

**Key Features:**

- HTTP method handlers for different request types
- Server-side rendering with streaming support
- Error handling with fallback components
- Metadata management for HTML head elements
- Type-safe context with request parameters and state

### Widget Modules

Widget modules are reusable components that can be embedded in different contexts. They support both server-side and client-side rendering.

```typescript
type WidgetModule = ServerWidgetModule | ClientWidgetModule;

interface ServerWidgetModule {
  default?: unknown;
  meta?: Meta;
  render?: ServerRender;
}

interface ClientWidgetModule {
  default?: unknown;
  meta?: Meta;
  render?: ClientRender;
}
```

**Key Features:**

- Isomorphic components that work on server and client
- Progressive hydration support
- Lifecycle management for client-side rendering
- Metadata integration for dynamic head elements

### Action Modules

Action modules contain server-side functions that can be called from the client to perform operations.

```typescript
interface ActionModule {
  [method: string]: ActionHandler;
}

interface ActionHandler<A = SerializableValue, T = SerializableValue> {
  (...args: A[]): Promise<T>;
}
```

**Key Features:**

- Type-safe serializable arguments and return values
- Promise-based async operations
- Method-based organization for multiple actions

### Middleware Modules

Middleware modules provide request processing and context modification capabilities.

```typescript
interface MiddlewareModule {
  handler?: MiddlewareHandler | MiddlewareHandlers;
}

interface MiddlewareHandler {
  (
    context: MiddlewareContext,
    next: MiddlewareNext
  ): MiddlewareResult | Promise<MiddlewareResult>;
}
```

**Key Features:**

- HTTP method-specific middleware handlers
- Context modification and state management
- Chainable middleware execution
- Type-safe context and response handling

## Core Types

### HTTP Types

Standard HTTP request/response handling with error management and state management.

```typescript
interface FetchContext<Params = Record<string, string>> {
  request: Request;
  params: Readonly<Params>;
  state: State;
  error?: HTTPException;
}

interface HTTPException extends Error {
  expose?: boolean;
  status?: number;
  statusText?: string;
}
```

### Metadata Types

Comprehensive HTML document metadata management for dynamic head elements.

```typescript
interface Meta {
  title?: string;
  description?: string;
  link?: LinkDescriptor[];
  meta?: MetaDescriptor[];
  script?: ScriptDescriptor[];
  style?: StyleDescriptor[];
  base?: BaseDescriptor;
}
```

### Rendering Types

Server-side and client-side rendering interfaces with streaming support.

```typescript
interface ServerRender<Component, Data, Options, Result> {
  (
    component: Component,
    data: Data,
    options: Options
  ): Result | Promise<Result>;
}

interface ClientRender<Component, Data, Options, Result> {
  (
    component: Component,
    data: Data,
    options: Options
  ): Result | Promise<Result>;
}
```

## Design Principles

### Technology Agnostic

The schema is designed to be framework-agnostic, allowing different frontend technologies to implement the same module format while maintaining their unique characteristics.

### Type Safety

Comprehensive TypeScript definitions ensure type safety across the entire application stack, from server to client.

### Web Standards

Built on web standards like Fetch API, ReadableStream, and standard HTTP methods, ensuring long-term compatibility.

### Modularity

Clear separation of concerns with distinct module types for different responsibilities, enabling better code organization and reusability.

## Usage

This schema serves as a foundation for implementing module-based web applications. Framework implementations can use these types to ensure consistency and interoperability across different technology stacks.

The type definitions provide detailed JSDoc comments for each interface and method, making them self-documenting for developers implementing this standard.
