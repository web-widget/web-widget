<script setup lang="ts">
import { syncCacheProvider } from '@web-widget/helpers/cache';
import { ref } from 'vue';

const props = defineProps({
  username: String,
});

const url = `https://api.github.com/users/${props.username}`;
const cacheKey = url + '@vue2';

const data = syncCacheProvider(cacheKey, async () => {
  console.log('[github]', 'fetch..');
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`[github] ${JSON.stringify(await resp.json())}`);
  }
  const { name, location, avatar_url } = await resp.json();
  return { name, location, avatar_url, ['vue2@</' + 'script>']: 1 };
});

const show = ref(false);
</script>

<template>
  <div>
    <button @click="show = true">Vue: Show Github Info</button>
    <pre v-show="show">{{ data }}</pre>
  </div>
</template>
