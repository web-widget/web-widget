# @web-widget/lifecycle-cache

This is a simple and powerful end-to-end caching library.

The cache's lifetime begins when the server receives the request, and it will be serialized and streamed to the client until the client unloads The web page is cleared.

## Usage

### React component

```ts
import { syncCacheProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id?: string;
};

export default () => {
  const data = syncCacheProvider<Data>('cache_key', async () => {
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

### Vue3 component

```vue
<script setup lang="ts">
import { asyncCacheProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id?: string;
};

const data = await asyncCacheProvider<Data>('cache_key', async () => {
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

### Vue2 component

```vue
<script setup lang="ts">
import { syncCacheProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id?: string;
};

const data = syncCacheProvider<Data>('cache_key', async () => {
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

### Route module or middleware module

```tsx
import { lifecycleCache } from '@web-widget/lifecycle-cache';

type ICache = {
  uid?: string;
  name?: string;
};

export const handler = async () => {
  lifecycleCache<ICache>().set('uid', '89').set('name', 'hello');
};
```

## API

### `asyncCacheProvider(cacheKey, handler)`

Provide end-to-end cached values, the results are asynchronous.

- `cacheKey` Must be a string or number
- `handler` Cache provider handler

### `syncCacheProvider(cacheKey, handler)`

Provide end-to-end cached values, the results are synchronized.

- `cacheKey` Must be a string or number
- `handler` Cache provider handler

### `lifecycleCache()`

This is a low-level lifecycle cache API that returns a `LifecycleCache` object.

Methods:

- `delete(cacheKey)`
- `get(cacheKey)`
- `has(cacheKey)`
- `set(cacheKey, value, expose)`

Parameters:

- `cacheKey` Must be a string or number
- `value` The value to store
- `expose` Whether exposed to the client, the default is `false`
