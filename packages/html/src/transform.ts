import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'html',
  extensions: ['.ts', '.js'],
  adapter: '@web-widget/html/adapter',
} satisfies WidgetTransform;
