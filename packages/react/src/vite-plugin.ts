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
      config(config) {
        config.resolve ||= {};
        config.resolve.alias ||= {};

        const aliases = [
          { find: "react-dom/server", replacement: "react-dom/server.browser" },
        ];

        if (Array.isArray(config.resolve.alias)) {
          config.resolve.alias = [...config.resolve.alias, ...aliases];
        } else {
          for (const alias of aliases) {
            (config.resolve.alias as Record<string, string>)[alias.find] =
              alias.replacement;
          }
        }
      },
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
                return !!config.build.ssr || config.command === "serve";
              },
            },
          ],
        ],
      },
    }),
  ];
}
