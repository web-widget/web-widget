import type { Plugin, PluginOption, ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Options } from "@vitejs/plugin-react";

export default function ReactWebWidgetVitePlugin(
  options: Options = {}
): Plugin | PluginOption {
  let config: ResolvedConfig;
  return [
    {
      name: "@web-widget/react:get-config",
      enforce: "pre",
      configResolved(resolvedConfig) {
        config = resolvedConfig;
      },
    },
    ...react({
      ...options,
      babel: {
        ...options?.babel,
        plugins: [
          // @ts-expect-error
          ...(options?.babel?.plugins || []),
          [
            "@web-widget/react/babel-plugin",
            {
              get base() {
                return config.base;
              },
              get root() {
                return config.root;
              },
              get isServer() {
                return !!config.build.ssr;
              },
            },
          ],
        ],
      },
    }),
  ];
}
