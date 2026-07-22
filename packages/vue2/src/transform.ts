import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'vue2',
  extensions: ['.vue'],
  adapter: '@web-widget/vue2/adapter',
  deriveExports: [
    { name: 'handler', default: '{GET({render}){return render()}}' },
    { name: 'meta', default: '{}' },
  ],
} satisfies WidgetTransform;
