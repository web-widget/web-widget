import type { WebWidgetRendererOptions } from './contracts';

type RendererElementOptions = Omit<
  WebWidgetRendererOptions,
  'children' | 'renderStage'
>;

export const defaultWebWidgetRendererOptions = {
  loading: 'auto',
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

export function omitDefaultWebWidgetRendererOptions(
  options: RendererElementOptions
): RendererElementOptions {
  const serializedOptions = { ...options };
  if (serializedOptions.loading === defaultWebWidgetRendererOptions.loading) {
    delete serializedOptions.loading;
  }
  if (serializedOptions.root === defaultWebWidgetRendererOptions.root) {
    delete serializedOptions.root;
  }
  return serializedOptions;
}
