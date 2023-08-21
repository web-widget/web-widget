<script  lang="ts">
export default {
  props:["name", "start"],
  data(){
    return {
      count: this.start ?? 0
    }
  }
}
</script>

<template>
  <div v-bind:title="name">
    <button @click="count--">-1</button>
    <button class="count">{{ count }}</button>
    <button @click="count++">+1</button>
  </div>
</template>

<style scoped>
  .count {
    padding-left: 10px;
    padding-right: 10px;
    font-weight: bold;
    color: cadetblue;
    border: 1px solid transparent;
    background: transparent;
  }
</style>