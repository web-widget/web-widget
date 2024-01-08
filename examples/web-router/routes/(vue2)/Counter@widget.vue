<script  lang="ts">
console.log('vue2 counter');
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
  <div class="counter">
    <button @click="count--">−</button>
    <span class="count">{{ count }}</span>
    <button @click="count++">+</button>
  </div>
</template>

<style scoped>
  .counter {
    display: inline-block;
    line-height: 1em;
    padding: 20px;
    border-radius: 30px;
    font-size: 16px;
    background: linear-gradient(315deg,#42d392 25%,#647eff);
  }
  .counter button {
    width: 2em;
    height: 2em;
    line-height: 2em;
    text-align: center;
    border-radius: 100%;
    font-size: 1em;
    border: 0 none;
    outline: #FFF solid 5px;
    background: rgba(255, 255, 255, .1);
    color: #FFF;
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
    color: #FFF;
    background: transparent;
  }
</style>