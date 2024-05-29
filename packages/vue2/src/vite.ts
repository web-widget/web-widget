import type { Plugin } from 'vite';
import { webWidgetPlugin } from '@web-widget/vite-plugin';
import type { WebWidgetUserConfig } from '@web-widget/vite-plugin';

// Examples:
// .vue?vue&type=script&setup=true&lang.ts
// .vue?vue&type=style&index=0&scoped=7b8d5933&lang.less
const VUE_INTERNAL_REQUEST = /\.vue\?vue\b.*$/;

// Examples:
// .vue?vue&type=script&setup=true&lang.ts
const VUE_INTERNAL_SCRIPT_REQUEST = /\.vue\?vue&type=script\b.*$/;

export interface Vue2WebWidgetPluginOptions extends WebWidgetUserConfig {}

export default function vue2WebWidgetPlugin(
  options?: Vue2WebWidgetPluginOptions
): Plugin[] {
  const {
    provide = '@web-widget/vue2',
    export: exportWidget = {},
    import: importWidget = {},
  } = options ?? {};
  const route = /(?:\.|@)route\.vue(?:\?.*)?$/;
  const widget = /(?:\.|@)widget\.vue(?:\?.*)?$/;
  return webWidgetPlugin({
    provide,
    export: {
      include: [route, widget],
      exclude: VUE_INTERNAL_REQUEST,
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
    },
    import: {
      include: /(?:\.|@)widget\..*$/,
      exclude: VUE_INTERNAL_REQUEST,
      includeImporter: [
        // vite: dev mode
        /\.vue$/,
        // vite: build mode
        VUE_INTERNAL_SCRIPT_REQUEST,
      ],
      ...importWidget,
    },
  });
}
