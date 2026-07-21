<script setup lang="ts">
import ReactCounter from '~/routes/(components)/react/Counter@widget';
import Vue3Counter from '~/routes/(vue3)/(components)/Vue3Counter@widget.vue';
import Vue2Counter from '~/routes/(vue2)/(components)/Vue2Counter@widget.vue';
</script>

<template>
  <div>
    <section class="ds-section">
      <h2>React component</h2>
      <ReactCounter :count="3" />
    </section>

    <section class="ds-section">
      <h2>Vue3 component</h2>
      <Vue3Counter :count="3" />
    </section>

    <section class="ds-section">
      <h2>Vue2 component</h2>
      <Vue2Counter :count="3" />
    </section>
  </div>
</template>
