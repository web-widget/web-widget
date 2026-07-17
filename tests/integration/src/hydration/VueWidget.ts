import { defineComponent, h, ref } from 'vue';

export default defineComponent({
  name: 'IntegrationVueWidget',
  setup() {
    const count = ref(0);
    return () =>
      h('div', { 'data-mount-root': 'vue' }, [
        h(
          'span',
          {
            class: 'hydration-probe vue-probe',
            'data-hydration-probe': 'vue',
          },
          `Vue ${count.value}`
        ),
        h(
          'button',
          {
            'data-hydration-increment': 'vue',
            type: 'button',
            onClick: () => count.value++,
          },
          'Increment'
        ),
      ]);
  },
});
