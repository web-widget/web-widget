<script setup lang="ts">
import { defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.vue';
import EditButton from '../(components)/EditButton@widget.vue';
import Echo from './Echo@widget';
import shared from '../(components)/shared.module.css';

const currentFileUrl = import.meta.url;

defineOptions({
  meta: defineMeta({
    title: 'Server Actions - Web Widget',
  }),
});
</script>

<template>
  <BaseLayout>
    <div :class="shared.container">
      <h1 :class="shared.pageTitle">⚡ Server Actions</h1>

      <div :class="`${shared.highlight} ${shared.info}`">
        <h2>Call server-side functions directly from the client</h2>
        <p>
          Server actions allow you to run server-side functions directly from
          client components, creating a seamless bridge between frontend and
          backend code.
        </p>
      </div>

      <div :class="shared.mb6">
        <h3 :class="shared.sectionTitle">Core Features</h3>
        <div :class="`${shared.grid} ${shared.grid3}`">
          <div :class="shared.card">
            <div :class="shared.cardIcon">🔒</div>
            <h4 :class="shared.cardTitle">Type Safe</h4>
            <p :class="shared.cardDescription">
              TypeScript type checking covers the complete call chain from
              client to server
            </p>
          </div>
          <div :class="shared.card">
            <div :class="shared.cardIcon">🔄</div>
            <h4 :class="shared.cardTitle">Auto Serialization</h4>
            <p :class="shared.cardDescription">
              Automatically handles parameter and return value serialization,
              no manual conversion needed
            </p>
          </div>
          <div :class="shared.card">
            <div :class="shared.cardIcon">📞</div>
            <h4 :class="shared.cardTitle">Direct Call</h4>
            <p :class="shared.cardDescription">
              Call server functions like local functions, no need to write API
              routes
            </p>
          </div>
        </div>
      </div>

      <div :class="`${shared.infoPanel} ${shared.success}`">
        <h3 :class="shared.subsectionTitle">Interactive Demo</h3>
        <p>
          Enter some text below. After clicking "Send to Server", the text
          will be sent to the server-side function for processing, and return
          a response containing timestamp and server information.
        </p>
        <div style="margin-top: 1.5rem;">
          <Echo />
        </div>
      </div>

      <div :class="shared.comparison">
        <h3 :class="`${shared.subsectionTitle} ${shared.textCenter}`">
          Comparison with Traditional API
        </h3>
        <div :class="shared.comparisonGrid">
          <div :class="shared.comparisonItem">
            <h4 :class="shared.cardTitle" style="color: var(--color-error); margin-bottom: 1rem;">
              Traditional REST API
            </h4>
            <ul style="list-style: none; padding: 0;">
              <li>❌ Need to create separate API routes</li>
              <li>⚙️ Manual request/response serialization</li>
              <li>🔄 Client and server types easily get out of sync</li>
              <li>🛠️ Need additional error handling and state management</li>
              <li>🔗 URL paths and parameters prone to errors</li>
            </ul>
          </div>
          <div :class="shared.comparisonItem">
            <h4 :class="shared.cardTitle" style="color: var(--color-success); margin-bottom: 1rem;">
              Web Widget Server Actions
            </h4>
            <ul style="list-style: none; padding: 0;">
              <li>✅ Function is API, no additional routes needed</li>
              <li>⚡ Auto serialization, no manual conversion</li>
              <li>🔒 Complete TypeScript type safety</li>
              <li>🎯 Built-in loading and error states</li>
              <li>📞 Call like local functions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit button - only shown in development -->
    <EditButton :currentFileUrl="currentFileUrl" />
  </BaseLayout>
</template>