import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'web-components',
  extensions: ['.wc.ts', '.wc.js'],
  adapter: '@web-widget/web-components/adapter',
} satisfies WidgetTransform;
