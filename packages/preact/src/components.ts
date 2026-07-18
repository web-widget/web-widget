import type { ComponentChildren, ComponentType, VNode } from 'preact';
import { Component, createElement } from 'preact';
import { Suspense, memo, useMemo } from 'preact/compat';
import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
export type { WidgetContainerOptions } from '@web-widget/schema';

export type PreactWidgetContainerProps =
  WidgetContainerProps<ComponentChildren>;

export type PreactWidgetComponent<T = unknown> = ComponentType<
  T & { children?: ComponentChildren; widget?: PreactWidgetContainerProps }
>;

function resolveFallback(fallback: PreactWidgetContainerProps['fallback']) {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    !Array.isArray(fallback) &&
    !('type' in fallback) &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    const value = fallback as {
      pending?: ComponentChildren;
      error?: ComponentChildren;
    };
    return { pending: value.pending, error: value.error ?? value.pending };
  }
  return { pending: fallback, error: fallback };
}

function suspend<T>(promise: Promise<T>): () => T {
  let value: T;
  let error: unknown;
  let status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  promise.then(
    (result) => {
      value = result;
      status = 'fulfilled';
    },
    (reason) => {
      error = reason;
      status = 'rejected';
    }
  );
  return () => {
    if (status === 'pending') throw promise;
    if (status === 'rejected') throw error;
    return value!;
  };
}

const renderResources = new WeakMap<
  WebWidgetRendererOptions,
  () => { tag: string; attributes: Record<string, string>; html: string }
>();

class WidgetErrorBoundary extends Component<
  { fallback?: ComponentChildren; children?: ComponentChildren },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

function WebWidget(props: {
  loader: WidgetModuleLoader;
  options: WebWidgetRendererOptions;
  pending?: ComponentChildren;
  clientOnly?: boolean;
}) {
  if (
    props.clientOnly &&
    typeof window === 'undefined' &&
    props.pending != null
  ) {
    const renderer = new WebWidgetRenderer(props.loader, props.options);
    return createElement(
      renderer.localName,
      renderer.attributes,
      createElement(
        'div',
        {
          'aria-busy': String(renderer.pendingBoundary.ariaBusy),
          slot: renderer.pendingBoundary.slot,
          style: { display: renderer.pendingBoundary.display },
        },
        props.pending
      )
    );
  }
  let read = renderResources.get(props.options);
  if (!read) {
    const renderer = new WebWidgetRenderer(props.loader, props.options);
    read = suspend(
      renderer.renderInnerHTMLToString().then((html) => ({
        tag: renderer.localName,
        attributes: renderer.attributes,
        html,
      }))
    );
    renderResources.set(props.options, read);
  }
  const { tag, attributes, html } = read();
  return createElement(tag, {
    ...attributes,
    dangerouslySetInnerHTML: { __html: html },
  });
}

export function container<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): PreactWidgetComponent<ExtractWidgetProps<M>>;
export function container<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): PreactWidgetComponent<Props>;
export function container(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  return memo(function PreactWidget({ children, widget = {}, ...data }: any) {
    if (children) throw new TypeError('Children not supported.');
    const { pending, error } = resolveFallback(widget.fallback);
    const renderOptions = {
      id: widget.id,
      loading: widget.loading ?? options.loading,
      renderStage: widget.serverOnly
        ? ('server' as const)
        : widget.clientOnly
          ? ('client' as const)
          : options.renderStage,
    };
    const rendererOptions = useMemo(
      () => ({
        ...options,
        children: '',
        data,
        ...renderOptions,
        renderTarget: options.renderTarget,
      }),
      [data, renderOptions.id, renderOptions.loading, renderOptions.renderStage]
    );
    return createElement(
      WidgetErrorBoundary,
      { fallback: error },
      createElement(Suspense, {
        fallback: pending,
        children: createElement(WebWidget, {
          clientOnly: widget.clientOnly,
          loader,
          options: rendererOptions,
          pending,
        }),
      })
    ) as VNode;
  });
}
