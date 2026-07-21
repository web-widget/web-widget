import type { WebWidgetRendererOptions } from './types';

type RendererElementOptions = Omit<
  WebWidgetRendererOptions,
  'children' | 'renderStage'
>;

export const defaultWebWidgetRendererOptions = {
  loading: 'lazy',
  root: 'light',
} as const satisfies RendererElementOptions;

export function resolveWebWidgetRendererOptions(
  options: RendererElementOptions
): RendererElementOptions {
  return {
    ...options,
    loading: options.loading ?? defaultWebWidgetRendererOptions.loading,
    root: options.root ?? defaultWebWidgetRendererOptions.root,
  };
}
