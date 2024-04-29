# @web-widget/lifecycle-cache

This is a simple and powerful end-to-end caching library. Its life cycle begins when the server receives a request and ends when the web page is unloaded by the client.

## Usage

### Route module

```tsx
import { lifecycleCache } from '@web-widget/lifecycle-cache';

type ICache = {
  id?: string;
  name?: string;
};

export const handler = {
  GET() {
    const cache = lifecycleCache<ICache>();
    cache.set('id', 'hello world');
  },
};

export default () => {
  const cache = lifecycleCache<ICache>();
  const value = cache.get('id');
  return (
    <>
      <h1>{value}</h1>
    </>
  );
};
```

### React component

```ts
import { cacheSyncProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id: string;
};

export default () => {
  const data = cacheSyncProvider<Data>('cache_key', async () => {
    const o = await fetchData();
    return { id: o.id };
  });
  return (
    <>
      <h1>{data.id}</h1>
    </>
  );
};
```

### Vue2 component

```vue
<script setup lang="ts">
import { cacheSyncProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id: string;
};

const data = cacheSyncProvider<Data>('cache_key', async () => {
  const o = await fetchData();
  return { id: o.id };
});
</script>

<template>
  <h1>
    {{ data.id }}
  </h1>
</template>
```

### Vue3 component

```vue
<script setup lang="ts">
import { cacheAsyncProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id: string;
};

const data = await cacheAsyncProvider<Data>('cache_key', async () => {
  const o = await fetchData();
  return { id: o.id };
});
</script>

<template>
  <h1>
    {{ data.id }}
  </h1>
</template>
```

## `LifecycleCache` class

### `delete(cacheKey)`

- `cacheKey` Must be a string or number

### `get(cacheKey)`

- `cacheKey` Must be a string or number

### `has(cacheKey)`

- `cacheKey` Must be a string or number

### `set(cacheKey, value, httpOnly)`

- `cacheKey` Must be a string or number
- `value` The value to store
- `httpOnly` Whether it is only readable on the server side, the default is `true`

## Helpers

### `cacheAsyncProvider(cacheKey, handler)`

Get the value of asynchronous cache.

- `cacheKey` Must be a string or number
- `handler` Cache provider handler

### `cacheSyncProvider(cacheKey, handler)`

Get synchronized cached value.

- `cacheKey` Must be a string or number
- `handler` Cache provider handler
