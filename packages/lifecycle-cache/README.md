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
  const data = cacheSyncProvider<data>('cache_key', async () => {
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
import { cacheSyncProvider } from '@web-widget/helpers/cache';

type Data = {
  id: string;
};

const data = cacheSyncProvider<data>('cache_key', async () => {
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
import { cacheAsyncProvider } from '@web-widget/helpers/cache';

type Data = {
  id: string;
};

const data = await cacheAsyncProvider<data>('cache_key', async () => {
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
