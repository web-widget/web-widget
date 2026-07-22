import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'preact',
  extensions: ['.tsx', '.jsx'],
  adapter: '@web-widget/preact/adapter',
} satisfies WidgetTransform;
