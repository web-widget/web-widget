import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import { WebWidgetRenderer } from '@web-widget/web-widget';
import { Suspense, createElement, use, memo } from 'react';
import type { FunctionComponent, ReactNode } from 'react';

export interface ReactWidgetComponent<T>
  extends FunctionComponent<T & WebWidgetSuspenseProps> {}

export interface WebWidgetProps {
  base?: WebWidgetRendererOptions['base'];
  children /**/?: ReactNode;
  data?: WebWidgetRendererOptions['data'];
  import?: WebWidgetRendererOptions['import'];
  inactive?: WebWidgetRendererOptions['inactive'];
  loader /**/ : Loader;
  meta?: WebWidgetRendererOptions['meta'];
  loading?: WebWidgetRendererOptions['loading'];
  name?: WebWidgetRendererOptions['name'];
  renderStage?: WebWidgetRendererOptions['renderStage'];
  renderTarget?: WebWidgetRendererOptions['renderTarget'];
}

interface WebWidgetElement {
  localName: string;
  attributes: Record<string, string>;
  innerHTML: Promise<string>;
}

const renderWebWidget = function ({
  children,
  loader,
  ...props
}: WebWidgetProps): WebWidgetElement {
  if (!loader) {
    throw new TypeError(`Missing loader.`);
  }

  if (children) {
    throw new TypeError(`Children not supported.`);
  }

  const widget = new WebWidgetRenderer(loader as Loader, {
    ...props,
    // TODO children
    children: '',
  });
  const localName = widget.localName;
  const attributes = widget.attributes;
  const innerHTML = widget.renderInnerHTMLToString();
  return {
    localName,
    attributes,
    innerHTML,
  };
};

function WebWidget({ localName, attributes, innerHTML }: WebWidgetElement) {
  const html = use(innerHTML);
  return createElement(localName, {
    ...attributes,
    dangerouslySetInnerHTML: { __html: html },
    // NOTE: Since the innerHTML property of a widget
    // will inevitably differ between the server and the client,
    // this turns off hydration mismatch warnings.
    suppressHydrationWarning: true,
  });
}

export type DefineWebWidgetOptions = Partial<
  Pick<
    WebWidgetRendererOptions,
    'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
  >
>;

export interface WebWidgetSuspenseProps {
  children?: ReactNode;
  fallback?: ReactNode;
  experimental_loading?: WebWidgetRendererOptions['loading'];
  renderStage?: WebWidgetRendererOptions['renderStage'];
  experimental_renderTarget?: WebWidgetRendererOptions['renderTarget'];
}

export /*#__PURE__*/ function defineWebWidget(
  loader: Loader,
  options: DefineWebWidgetOptions
) {
  return memo(function WebWidgetSuspense({
    children,
    fallback,
    experimental_loading = options.loading ?? 'lazy',
    renderStage = options.renderStage,
    experimental_renderTarget = options.renderTarget ?? 'light',
    ...data
  }: WebWidgetSuspenseProps) {
    return createElement(Suspense, {
      fallback,
      children: createElement(
        WebWidget,
        renderWebWidget({
          ...options,
          children,
          data,
          loader,
          loading: experimental_loading,
          renderStage,
          renderTarget: experimental_renderTarget,
        })
      ),
    });
  });
}
