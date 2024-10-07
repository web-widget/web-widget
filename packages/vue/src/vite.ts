import { webWidgetPlugin } from '@web-widget/vite-plugin';
import type { WebWidgetUserConfig } from '@web-widget/vite-plugin';

// Examples:
// .vue?vue&type=script&setup=true&lang.ts
// .vue?vue&type=style&index=0&scoped=7b8d5933&lang.less
// .vue?direct&vue&type=style&index=0&scoped=7b8d5933&lang.css
const VUE_INTERNAL_REQUEST = /\.vue\?(?:direct&)?vue\b.*$/;

// Examples:
// .vue?vue&type=script&setup=true&lang.ts
const VUE_INTERNAL_SCRIPT_REQUEST = /\.vue\?vue&type=script\b.*$/;

export interface VueWebWidgetPluginOptions
  extends Partial<WebWidgetUserConfig> {}

export default function vueWebWidgetPlugin(
  options?: VueWebWidgetPluginOptions
) {
  const {
    manifest,
    provide = '@web-widget/vue',
    export: exportWidget = {},
    import: importWidget = {},
  } = options ?? {};
  const route = /(?:\.|@)route\.vue(?:\?.*)?$/;
  const widget = /(?:\.|@)widget\.vue(?:\?.*)?$/;
  return webWidgetPlugin({
    manifest,
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
