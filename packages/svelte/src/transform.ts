import type { WidgetTransform } from '@web-widget/schema';

export default {
  name: 'svelte',
  extensions: ['.svelte'],
  adapter: '@web-widget/svelte/adapter',
} satisfies WidgetTransform;
