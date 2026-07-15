import type { ComponentChildren, ComponentType, VNode } from 'preact';
import { Component, createElement } from 'preact';
import { Suspense, memo, useMemo } from 'preact/compat';
import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import type { ExtractWidgetProps } from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';

export type DefineWebWidgetOptions = Partial<
  Pick<
    WebWidgetRendererOptions,
    'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
  >
>;

export type WidgetFallback =
  | ComponentChildren
  | { pending?: ComponentChildren; error?: ComponentChildren };

export interface WidgetContainerConfig {
  fallback?: WidgetFallback;
  loading?: WebWidgetRendererOptions['loading'];
  serverOnly?: true;
  clientOnly?: true;
}

export type PreactWidgetComponent<T = unknown> = ComponentType<
  T & { children?: ComponentChildren; widget?: WidgetContainerConfig }
>;

function resolveFallback(fallback: WidgetFallback | undefined) {
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
  loader: Loader;
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
        renderer.pendingLocalName,
        {
          'aria-busy': 'true',
          style: { display: 'contents' },
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
  options?: DefineWebWidgetOptions
): PreactWidgetComponent<ExtractWidgetProps<M>>;
export function container<Props>(
  loader: Loader,
  options?: DefineWebWidgetOptions
): PreactWidgetComponent<Props>;
export function container(
  loader: Loader,
  options: DefineWebWidgetOptions = {}
) {
  return memo(function PreactWidget({ children, widget = {}, ...data }: any) {
    if (children) throw new TypeError('Children not supported.');
    const { pending, error } = resolveFallback(widget.fallback);
    const renderStage = widget.serverOnly
      ? 'server'
      : widget.clientOnly
        ? 'client'
        : options.renderStage;
    const rendererOptions = useMemo(
      () => ({
        ...options,
        children: '',
        data,
        loading: widget.loading ?? options.loading ?? 'lazy',
        renderStage,
        renderTarget: options.renderTarget ?? 'light',
      }),
      [data, renderStage, widget.loading]
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
