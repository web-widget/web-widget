<template>
  <ul class="menu">
    <li class="menu-home"><a href="/">🏠 Home</a></li>
    <template v-for="group in navigation">
      <li :key="group.name" class="menu-category">{{ group.name }}</li>
      <li v-for="item in group.items" :key="item.href">
        <a :href="item.href" :target="item.external ? '_blank' : undefined">
          {{ item.title }}
        </a>
      </li>
    </template>
  </ul>
</template>

<script>
import { navigation } from '../(components)/catalog';

export default {
  data() {
    return { navigation };
  },
  mounted() {
    const path = location.pathname;
    document.querySelectorAll('aside a[href]').forEach((a) => {
      if (a.getAttribute('href') === path) {
        a.setAttribute('aria-current', 'page');
      }
    });
  },
};
</script>
