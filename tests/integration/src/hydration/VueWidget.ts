import { defineComponent, h, ref } from 'vue';

export default defineComponent({
  name: 'IntegrationVueWidget',
  setup() {
    const count = ref(0);
    return () =>
      h('div', { 'data-mount-root': 'vue' }, [
        h('slot', { name: 'label' }),
        h(
          'span',
          {
            class: 'hydration-probe vue-probe shadow-boundary-probe',
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
