import { webWidgetPlugin } from '@web-widget/vite-plugin';
import type { WebWidgetUserConfig } from '@web-widget/vite-plugin';

export interface ReactWebWidgetPluginOptions
  extends Partial<WebWidgetUserConfig> {}

export default function reactWebWidgetPlugin(
  options?: ReactWebWidgetPluginOptions
) {
  const {
    provide = '@web-widget/react',
    export: exportWidget = {},
    import: importWidget = {},
    manifest,
  } = options ?? {};
  return webWidgetPlugin({
    manifest,
    provide,
    export: {
      include: /(?:\.|@)(?:route|widget)\.(?:tsx|jsx)(?:\?as=.*)?$/,
      ...exportWidget,
    },
    import: {
      include: /(?:\.|@)widget\.[^?]*(?:\?as=.*)?$/,
      includeImporter: /\.(?:tsx|jsx)(?:\?as=.*)?$/,
      ...importWidget,
    },
  });
}
