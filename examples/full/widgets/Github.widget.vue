<script setup lang="ts">
import { useWidgetState } from '@web-widget/vue';
import { ref } from 'vue';
import { d } from '../../../packages/schema/dist/server-a2620326';

const props = defineProps({
    username: String,
});

const url = `https://api.github.com/users/${props.username}`;
const cacheKey = url;
const data = await useWidgetState(cacheKey, async () => {
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`An Error occurred`);
    }
    const { name, location, avatar_url } = await resp.json();
    return { name, location, avatar_url };
});

const show = ref(false);
</script>

<template>
    <div>
        <button @click="show = true">Show Github Info</button>
        <pre v-show="show">{{ data }}</pre>
    </div>
</template>