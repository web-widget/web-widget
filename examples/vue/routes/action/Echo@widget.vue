<script setup lang="ts">
import { ref } from 'vue';
import { echo } from './functions@action';
import './styles.css';

const inputValue = ref('');
const log = ref('');

const handleClick = async () => {
  const value = await echo(inputValue.value);
  log.value = JSON.stringify(value, null, 2);
};
</script>

<template>
  <div>
    <input type="text" v-model="inputValue" />

    <button @click="handleClick">
      echo
    </button>

    <div v-if="log" class="log">
      <p>
        This is the content returned from the server function. Please view
        the network request in the console.
      </p>
      <pre>{{ log }}</pre>
    </div>
  </div>
</template>