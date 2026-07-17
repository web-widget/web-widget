import type { Component, Snippet } from 'svelte';
import 'svelte/internal/flags/async';
import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
export type { WidgetContainerOptions } from '@web-widget/schema';

export type SvelteWidgetContainerProps = WidgetContainerProps<Snippet>;

export type SvelteWidgetComponent<T = unknown> = Component<
  T & { widget?: SvelteWidgetContainerProps }
>;

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function outerHTML(
  tag: string,
  attributes: Record<string, string>,
  html: string
) {
  const attrs = Object.entries(attributes)
    .map(([name, value]) =>
      value === '' ? name : `${name}="${escapeAttribute(value)}"`
    )
    .join(' ');
  return `<${tag}${attrs ? ` ${attrs}` : ''}>${html}</${tag}>`;
}

export function container<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): SvelteWidgetComponent<ExtractWidgetProps<M>>;
export function container<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): SvelteWidgetComponent<Props>;
export function container(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  return ((anchor: any, props: Record<string, any>) => {
    const { widget = {}, ...data } = props;
    const renderOptions = {
      loading: widget.loading ?? options.loading,
      renderStage: widget.serverOnly
        ? ('server' as const)
        : widget.clientOnly
          ? ('client' as const)
          : options.renderStage,
    };
    const renderer = new WebWidgetRenderer(loader, {
      ...options,
      children: '',
      data,
      ...renderOptions,
      renderTarget: options.renderTarget,
    });

    const render = async () =>
      outerHTML(
        renderer.localName,
        renderer.attributes,
        await renderer.renderInnerHTMLToString()
      );

    // Svelte's server renderer exposes child(), which tracks returned promises
    // and makes the top-level render output awaitable.
    if (typeof anchor?.child === 'function') {
      anchor.child(async (child: { push(value: string): void }) => {
        child.push(await render());
      });
      return;
    }

    void render().then((html) => {
      const existing = anchor.nextSibling;
      if (
        existing instanceof HTMLElement &&
        existing.localName === renderer.localName
      ) {
        for (const [name, value] of Object.entries(renderer.attributes)) {
          existing.setAttribute(name, value);
        }
        return;
      }
      const template = document.createElement('template');
      template.innerHTML = html;
      const element = template.content.firstElementChild;
      if (element) anchor.before(element);
    });
  }) as SvelteWidgetComponent<any>;
}
