<script lang="ts">
  let count = 0;
</script>

<div data-mount-root="svelte">
  <svelte:element this={'slot'} name="label"></svelte:element>
  <span class="shadow-boundary-probe" data-hydration-probe="svelte">Svelte {count}</span>
  <button data-hydration-increment="svelte" type="button" onclick={() => count++}>Increment</button>
</div>
