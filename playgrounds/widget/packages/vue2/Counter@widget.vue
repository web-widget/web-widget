<script lang="ts">
import Vue, { PropType } from 'vue';

export default Vue.extend({
  props: {
    count: {
      type: Number as PropType<number>,
      required: true,
    },
  },
  data() {
    return {
      value: this.count,
    };
  },
});
</script>

<template>
  <div class="counter">
    <button @click="value--">−</button>
    <span class="count">{{ value }}</span>
    <button @click="value++">+</button>
  </div>
</template>

<style scoped>
.counter {
  display: inline-block;
  line-height: 1em;
  padding: 20px;
  border-radius: 30px;
  font-size: 16px;
  background: linear-gradient(315deg, #42d392 25%, #647eff);
}

.counter button {
  width: 2em;
  height: 2em;
  line-height: 2em;
  text-align: center;
  border-radius: 100%;
  font-size: 1em;
  border: 0 none;
  outline: #fff solid 5px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}

.counter .count {
  display: inline-block;
  min-width: 1.5em;
  text-align: center;
  padding-left: 10px;
  padding-right: 10px;
  font-weight: bold;
  font-size: 1em;
  color: cadetblue;
  border: 1px solid transparent;
  color: #fff;
  background: transparent;
}
</style>