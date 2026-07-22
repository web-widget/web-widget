import type { Component, Snippet } from 'svelte';
import 'svelte/internal/flags/async';
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

export type SvelteWidgetContainerProps = WidgetContainerProps<Snippet>;

export type SvelteWidgetComponent<T = unknown> = Component<
  T &
    WidgetHostProps & {
      children?: Snippet;
      widget?: SvelteWidgetContainerProps;
    }
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

export function widget<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): SvelteWidgetComponent<ExtractWidgetProps<M>>;
export function widget<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): SvelteWidgetComponent<Props>;
export function widget(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  return ((anchor: any, props: Record<string, any>) => {
    const { widget = {}, children, slot, $$slots = {}, ...data } = props;
    const snippets = [
      children,
      ...Object.entries($$slots)
        .filter(
          ([name, snippet]) =>
            name !== 'default' && typeof snippet === 'function'
        )
        .map(([, snippet]) => snippet),
    ].filter((snippet): snippet is Snippet => typeof snippet === 'function');
    if (snippets.length && options.root !== 'shadow') {
      throw new Error(`Rendering content in a slot requires "root: 'shadow'".`);
    }
    const renderOptions = {
      ...options,
      clientOnly: widget.clientOnly,
      id: widget.id,
      loading: widget.loading ?? options.loading,
      serverOnly: widget.serverOnly,
    };
    const createRenderer = () =>
      new WebWidgetRenderer(loader, {
        ...renderOptions,
        data,
        root: options.root,
        slot,
      });

    const render = async () => {
      const renderer = createRenderer();
      return {
        html: outerHTML(
          renderer.localName,
          renderer.attributes,
          await renderer.renderInnerHTMLToString()
        ),
        renderer,
      };
    };

    // Svelte's server renderer exposes child(), which tracks returned promises
    // and makes the top-level render output awaitable.
    if (typeof anchor?.child === 'function') {
      anchor.child((child: any) => {
        let result: Awaited<ReturnType<typeof render>>;
        const rendering = render().then((value) => {
          result = value;
        });
        child.async([rendering], (output: any) => {
          if (!snippets.length) {
            output.push(result.html);
            return;
          }
          const templateEnd = result.html.indexOf('</template>');
          const boundaryEnd = templateEnd + '</template>'.length;
          output.push(result.html.slice(0, boundaryEnd));
          for (const snippet of snippets) (snippet as Function)(output);
          output.push(result.html.slice(boundaryEnd));
        });
      });
      return;
    }

    void render().then(({ html, renderer }) => {
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
      if (element) {
        anchor.before(element);
        const childAnchor = document.createTextNode('');
        element.append(childAnchor);
        for (const snippet of snippets) (snippet as Function)(childAnchor);
      }
    });
  }) as SvelteWidgetComponent<any>;
}
