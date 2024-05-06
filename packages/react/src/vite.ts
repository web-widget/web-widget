import type { Plugin } from 'vite';
import { webWidgetPlugin } from '@web-widget/vite-plugin';
import type { WebWidgetUserConfig } from '@web-widget/vite-plugin';

// Examples:
// .vue?vue&type=script&setup=true&lang.tsx
// .vue?vue&type=script&setup=true&lang.jsx
const VUE_INTERNAL_REQUEST = /\.vue\?vue\b.*$/;

export interface ReactWebWidgetPluginOptions extends WebWidgetUserConfig {}

export default function reactWebWidgetPlugin(
  options?: ReactWebWidgetPluginOptions
): Plugin[] {
  const {
    provide = '@web-widget/react',
    export: exportWidget = {},
    import: importWidget = {},
  } = options ?? {};
  return webWidgetPlugin({
    provide,
    export: {
      include: /(?:\.|@)(?:route|widget)\.(?:tsx|jsx)(?:\?.*)?$/,
      ...exportWidget,
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      includeImporter: /\.(?:tsx|jsx)(?:\?.*)?$/,
      ...importWidget,
      excludeImporter: [
        ...toArray(importWidget.excludeImporter),
        VUE_INTERNAL_REQUEST,
      ],
    },
  });
}

function toArray(value: any) {
  return Array.isArray(value) ? value : value ? [value] : [];
}
