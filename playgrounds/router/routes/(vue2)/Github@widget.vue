<script setup lang="ts">
import { syncCacheProvider } from '@web-widget/helpers/cache';
import { context } from '@web-widget/helpers/context';
import { ref } from 'vue';

const props = defineProps({
  username: String,
});

const url = `/api/mock-users?username=${props.username}`;
const cacheKey = url;

const data = syncCacheProvider(cacheKey, async () => {
  console.log('[mock-users]', 'fetch..');

  // Get current service URL from request context
  const { request } = context();
  const currentUrl = new URL(request.url);
  const fullUrl = `${currentUrl.origin}${url}`;
  const resp = await fetch(fullUrl);
  if (!resp.ok) {
    throw new Error(`[mock-users] ${JSON.stringify(await resp.json())}`);
  }
  const userData = await resp.json();
  return { ...userData, ['vue2@</' + 'script>']: 1 };
});

const show = ref(false);
</script>

<template>
  <div>
    <button @click="show = true">Vue2: Show Framework Info</button>
    <pre v-show="show">{{ data }}</pre>
  </div>
</template>
