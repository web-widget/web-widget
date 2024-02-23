import type { Plugin } from 'vite';
import { webWidgetPlugin } from '@web-widget/vite-plugin';
import type { WebWidgetPluginOptions } from '@web-widget/vite-plugin';

// Examples:
// .vue?vue&type=script&setup=true&lang.ts
// .vue?vue&type=style&index=0&scoped=7b8d5933&lang.less
const VUE_INTERNAL_REQUEST = /.*\.vue\?vue\b.*$/;

export interface Vue2WebWidgetPluginOptions extends WebWidgetPluginOptions {}

export default function vue2WebWidgetPlugin({
  provide = '@web-widget/vue2',
  export: exportWidget = {},
  import: importWidget = {},
}: Vue2WebWidgetPluginOptions = {}): Plugin[] {
  const route = /(?:\.|@)route\.vue(?:\?.*)?$/;
  const widget = /(?:\.|@)widget\.vue(?:\?.*)?$/;
  return webWidgetPlugin({
    provide,
    export: {
      include: [route, widget],
      extractFromExportDefault: [
        {
          name: 'handler',
          default: '{GET({render}){return render()}}',
          include: route,
        },
        {
          name: 'meta',
          default: '{}',
          include: route,
        },
      ],
      ...exportWidget,
      exclude: [...toArray(exportWidget.exclude), VUE_INTERNAL_REQUEST],
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      includeImporter: /.*\.vue(?:\?.*)?$/,
      ...importWidget,
      exclude: [...toArray(importWidget.exclude), VUE_INTERNAL_REQUEST],
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
