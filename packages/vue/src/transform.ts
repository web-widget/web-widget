import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'vue',
  extensions: ['.vue'],
  adapter: '@web-widget/vue/adapter',
  deriveExports: [
    { name: 'handler', default: '{GET({html}){return html()}}' },
    { name: 'meta', default: '{}' },
  ],
} satisfies WidgetTransform;
