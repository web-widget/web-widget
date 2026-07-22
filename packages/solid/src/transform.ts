import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'solid',
  extensions: ['.tsx', '.jsx'],
  adapter: '@web-widget/solid/adapter',
} satisfies WidgetTransform;
