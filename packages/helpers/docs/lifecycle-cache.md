# lifecycleCache

The cache's lifetime begins when the server receives the request, and it will be serialized and streamed to the client until the client unloads The web page is cleared.

## Examples

### Route or middleware

```tsx
import { lifecycleCache } from '@web-widget/helpers/cache';

type Data = {
  uid: string;
  name: string;
};

export const handler = async () => {
  lifecycleCache<Data>().set('uid', '89').set('name', 'hello');
};
```

### React component

```ts
import { syncCacheProvider } from '@web-widget/helpers/cache';
import { fetchData } from './fetch-data';

export default () => {
  const data = syncCacheProvider('cache_key', async () => {
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
import { cacheProvider } from '@web-widget/helpers/cache';
import { fetchData } from './fetch-data';

const data = await cacheProvider('cache_key', async () => {
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
import { syncCacheProvider } from '@web-widget/helpers/cache';

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

## Environment

`server` `client`

## `cacheProvider`

Provide end-to-end cached values, the results are asynchronous.

### Syntax

```ts
cacheProvider(cacheKey, handler);
```

### Parameters

- `cacheKey`: Must be a string or number.
- `handler`: Cache provider handler.

### Returns

Return a `Promise`.

## `syncCacheProvider`

Provide end-to-end cached values, the results are synchronized.

### Syntax

```ts
syncCacheProvider(cacheKey, handler);
```

### Parameters

- `cacheKey`: Must be a string or number.
- `handler`: Cache provider handler.

### Returns

Promise resolved value.

## `lifecycleCache`

This is a low-level lifecycle cache API that returns a `LifecycleCache` object.

### Syntax

```ts
lifecycleCache();
```

### Returns

Return cached operation interface.

- `delete(cacheKey)`
- `get(cacheKey)`
- `has(cacheKey)`
- `set(cacheKey, value, expose)`

Parameters:

- `cacheKey`: Must be a string or number.
- `value`: The value to store.
- `expose`: Whether exposed to the client, the default is `false`.
