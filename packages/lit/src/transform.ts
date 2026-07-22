import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'lit',
  extensions: ['.lit.ts', '.lit.js'],
  adapter: '@web-widget/lit/adapter',
} satisfies WidgetTransform;
