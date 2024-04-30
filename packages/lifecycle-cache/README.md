# @web-widget/lifecycle-cache

This is a simple and powerful end-to-end caching library. Its life cycle begins when the server receives a request and ends when the web page is unloaded by the client.

## Usage

### React component

```ts
import { syncCacheProvider } from '@web-widget/lifecycle-cache';

type Data = {
  id: string;
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
  id: string;
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
  id: string;
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
  id?: string;
  name?: string;
};

export const handler = async () => {
  lifecycleCache<ICache>().set('id', '89').set('name', 'hello');
};
```

## API

### `lifecycleCache()`

This is a low-level lifecycle cache API that returns a `lifecycleCache` object.

#### `delete(cacheKey)`

- `cacheKey` Must be a string or number

#### `get(cacheKey)`

- `cacheKey` Must be a string or number

#### `has(cacheKey)`

- `cacheKey` Must be a string or number

#### `set(cacheKey, value, expose)`

- `cacheKey` Must be a string or number
- `value` The value to store
- `expose` Whether exposed to the client, the default is `false`

### `asyncCacheProvider(cacheKey, handler)`

Provide end-to-end cached values, the results are asynchronous.

- `cacheKey` Must be a string or number
- `handler` Cache provider handler

### `syncCacheProvider(cacheKey, handler)`

Provide end-to-end cached values, the results are synchronized.

- `cacheKey` Must be a string or number
- `handler` Cache provider handler
