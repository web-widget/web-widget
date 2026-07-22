import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'react',
  extensions: ['.tsx', '.jsx'],
  adapter: '@web-widget/react/adapter',
} satisfies WidgetTransform;
