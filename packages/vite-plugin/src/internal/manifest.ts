import type { PluginOption, ResolvedConfig } from 'vite';

import type { WebRouterPlugin } from '@/types';

export function getWebRouterPluginApi(
  config:
    | Pick<ResolvedConfig, 'plugins'>
    | { plugins?: readonly PluginOption[] }
) {
  for (const plugin of config.plugins ?? []) {
    if (
      plugin &&
      typeof plugin === 'object' &&
      !Array.isArray(plugin) &&
      'name' in plugin &&
      plugin.name === '@web-widget:router'
    ) {
      return (plugin as WebRouterPlugin).api;
    }
  }

  return undefined;
}
