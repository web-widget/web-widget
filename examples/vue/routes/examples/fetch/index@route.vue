<script setup lang="ts">
import { defineMeta, defineRouteHandler } from '@web-widget/helpers';
import type { HelloData } from '../api/hello@route.ts';
import BaseLayout from '../(components)/BaseLayout.vue';
import EditButton from '../(components)/EditButton@widget.vue';
import shared from '../(components)/shared.module.css';

const currentFileUrl = import.meta.url;

defineOptions({
  meta: defineMeta({
    title: 'Data Fetching - Web Widget',
  }),
  handler: defineRouteHandler<HelloData>({
    async GET({ request, html }) {
      const url = new URL(request.url);
      const api = `${url.origin}/examples/api/hello`;
      const res = await fetch(api);

      if (!res.ok) {
        throw new Error(`Failed to fetch data from ${api}`);
      }

      const data = (await res.json()) as HelloData;
      return html(data);
    },
  }),
});

const { data } = defineProps<{ data: HelloData }>();
</script>

<template>
  <BaseLayout>
    <div :class="shared.container">
      <h1 :class="shared.pageTitle">🔄 Data Fetching</h1>

      <div :class="`${shared.highlight} ${shared.info}`">
        <h2>Fetch data on the server and render as static HTML</h2>
        <p>
          The following data is fetched on the server and rendered as static
          HTML. No need to wait for client-side loading and data requests,
          content is immediately visible.
        </p>
      </div>

      <div :class="shared.mb6">
        <h3 :class="shared.sectionTitle">
          Benefits of Server-Side Data Fetching
        </h3>
        <div :class="`${shared.grid} ${shared.grid3}`">
          <div :class="shared.card">
            <div :class="shared.cardIcon">🔍</div>
            <h4 :class="shared.cardTitle">SEO Optimized</h4>
            <p :class="shared.cardDescription">
              Search engines can directly index complete data content
            </p>
          </div>
          <div :class="shared.card">
            <div :class="shared.cardIcon">📱</div>
            <h4 :class="shared.cardTitle">Better User Experience</h4>
            <p :class="shared.cardDescription">
              Especially suitable for mobile devices and slow network
              environments
            </p>
          </div>
          <div :class="shared.card">
            <div :class="shared.cardIcon">🛡️</div>
            <h4 :class="shared.cardTitle">Data Security</h4>
            <p :class="shared.cardDescription">
              Sensitive API keys and logic only run on the server
            </p>
          </div>
        </div>
      </div>

      <div :class="`${shared.infoPanel} ${shared.success}`">
        <h3 :class="shared.subsectionTitle">Demo Data</h3>
        <p>The following data is fetched through server-side API calls:</p>

        <div :class="`${shared.grid} ${shared.grid2}`" style="margin-top: 1.5rem;">
          <div v-for="(item, index) in data" :key="index" :class="shared.card">
            <h4 :class="shared.cardTitle">{{ item.title }}</h4>
            <p :class="shared.textMuted" style="margin: 0;">
              Data item #{{ index + 1 }}
            </p>
          </div>
        </div>

        <div style="margin-top: 1.5rem;">
          <p>
            <strong>Data source:</strong>
            <a href="/examples/api/hello" target="_blank" :class="shared.link">
              /api/hello
            </a>
          </p>
          <p :class="shared.textMuted" style="font-size: 0.875rem; margin-top: 0.5rem;">
            Click the link above to view the original API response data
          </p>
        </div>
      </div>
    </div>

    <!-- Edit button - only shown in development -->
    <EditButton :currentFileUrl="currentFileUrl" />
  </BaseLayout>
</template>