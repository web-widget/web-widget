<script setup lang="ts">
import { navigation } from '../(components)/catalog';
</script>

<template>
  <nav aria-label="Playground examples">
    <ul class="menu">
      <li class="menu-home"><a href="/">Home</a></li>
      <template v-for="group in navigation" :key="group.name">
        <li class="menu-category">{{ group.name }}</li>
        <li v-for="item in group.items" :key="item.href">
          <a
            :href="item.href"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener' : undefined">
            {{ item.title }}
          </a>
        </li>
      </template>
    </ul>
  </nav>
</template>
