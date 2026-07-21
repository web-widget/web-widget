import type { Component, JSX } from 'solid-js';
import {
  ErrorBoundary,
  Suspense,
  createComponent,
  createResource,
  splitProps,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetHostProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
export type { WidgetContainerOptions } from '@web-widget/schema';

export type SolidWidgetContainerProps = WidgetContainerProps<JSX.Element>;

export type SolidWidgetComponent<T = unknown> = Component<
  T &
    WidgetHostProps & {
      children?: JSX.Element;
      widget?: SolidWidgetContainerProps;
    }
>;

function resolveFallback(fallback: SolidWidgetContainerProps['fallback']): {
  pending: JSX.Element;
  error: JSX.Element;
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    return {
      pending: fallback.pending,
      error: fallback.error ?? fallback.pending,
    };
  }
  return { pending: fallback as JSX.Element, error: fallback as JSX.Element };
}

export interface SolidWidgetFactory {
  <M>(
    loader: () => Promise<M>,
    options?: WidgetContainerOptions
  ): SolidWidgetComponent<ExtractWidgetProps<M>>;
  <Props>(
    loader: WidgetModuleLoader,
    options?: WidgetContainerOptions
  ): SolidWidgetComponent<Props>;
}

export function createWidgetAdapter(
  renderChildren?: (children: JSX.Element) => Promise<string>,
  renderHost?: (
    localName: string,
    attributes: Record<string, string>,
    children: JSX.Element
  ) => any,
  renderInnerHTML?: (html: string) => any
): SolidWidgetFactory {
  return ((
      loader: WidgetModuleLoader,
      options: WebWidgetRendererOptions = {}
    ) =>
    (props: Record<string, any>) => {
      // Reading a Solid children getter can resolve it eagerly. Check ownership
      // first so the original JSX subtree remains available to the SSR host.
      const hasChildren = 'children' in props;
      const [local, data] = splitProps(props, ['children', 'slot', 'widget']);
      const widget = local.widget ?? {};
      // Solid normally keeps the JSX subtree on the Host for hydration. That
      // is only valid for Shadow DOM slot projection; Light Target children
      // must follow the same protocol validation as every other adapter.
      if (hasChildren && options.root !== 'shadow') {
        throw new Error(
          `Rendering content in a slot requires "options.root = 'shadow'".`
        );
      }
      const fallback = resolveFallback(widget.fallback);
      const renderOptions = {
        id: widget.id,
        loading: widget.loading ?? options.loading,
        renderStage: widget.serverOnly
          ? ('server' as const)
          : widget.clientOnly
            ? ('client' as const)
            : options.renderStage,
      };
      const renderer = new WebWidgetRenderer(loader, {
        ...options,
        data,
        ...renderOptions,
        root: options.root,
        slot: local.slot,
      });
      const widgetProps = {
        component: renderer.localName,
        ...renderer.attributes,
      };
      if (!renderChildren && !renderHost && hasChildren) {
        return createComponent(Dynamic, {
          ...widgetProps,
          get children() {
            return local.children;
          },
        });
      }
      if (
        widget.clientOnly &&
        typeof window === 'undefined' &&
        fallback.pending != null
      ) {
        return createComponent(Dynamic, {
          ...widgetProps,
          get children() {
            return createComponent(Dynamic, {
              component: renderer.pendingBoundary.localName,
              'aria-busy': renderer.pendingBoundary.ariaBusy,
              slot: renderer.pendingBoundary.slot,
              style: `display: ${renderer.pendingBoundary.display}`,
              children: fallback.pending,
            });
          },
        });
      }
      const [html] = createResource<string | Error>(async () => {
        const children =
          local.children && renderChildren
            ? await renderChildren(local.children)
            : '';
        return renderer
          .renderInnerHTMLToString({
            children,
          })
          .catch((error: unknown) =>
            error instanceof Error ? error : new Error(String(error))
          );
      });
      const content = () => {
        const result = html();
        if (result instanceof Error) return fallback.error;
        if (result === undefined) return result;
        if (renderInnerHTML) return renderInnerHTML(result);
        return createComponent(Dynamic, {
          ...widgetProps,
          innerHTML: result,
        });
      };
      const boundary = createComponent(ErrorBoundary, {
        fallback: () => fallback.error,
        get children() {
          return createComponent(Suspense, {
            fallback: fallback.pending,
            get children() {
              return content();
            },
          });
        },
      });
      // Keep light DOM as Solid JSX under the host. Serializing it into the
      // renderer string would nest Solid's hydration protocol inside the Shadow
      // boundary and prevent progressively rendered child widgets from recovering.
      const hostChildren = hasChildren ? [boundary, local.children] : boundary;
      return renderHost
        ? renderHost(renderer.localName, renderer.attributes, hostChildren)
        : boundary;
    }) as SolidWidgetFactory;
}
