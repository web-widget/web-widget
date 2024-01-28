<script setup lang="ts">
console.log('vue', Date.now());
import { useWidgetState } from '@web-widget/vue';
import { ref } from 'vue';

const props = defineProps({
  username: String,
});

const url = `https://api.github.com/users/${props.username}`;
const cacheKey = url + '@vue';

const data = await useWidgetState(cacheKey, async () => {
  console.log('[github]', 'fetch..');
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`[github] ${JSON.stringify(await resp.json())}`);
  }
  const { name, location, avatar_url } = await resp.json();
  return { name, location, avatar_url, ['vue@</' + 'script>']: Date.now() };
});

const show = ref(false);
</script>

<template>
  <div>
    <button @click="show = true">Vue: Show Github Info</button>
    <pre v-show="show">{{ data }}</pre>
  </div>
</template>
