import * as layout from "./layout.default";

import type { LayoutComponentProps, Page, RenderPage } from "./types";
import type {
  Meta,
  RouteError,
  RouteRenderResult,
  ScriptDescriptor,
  WidgetRenderContext,
} from "@web-widget/schema/server";
import { NONE, UNSAFE_INLINE } from "./csp";

import type { ContentSecurityPolicy } from "./csp";

export interface InnerRenderOptions<Data> {
  bootstrap: ScriptDescriptor[];
  data?: Data;
  error?: RouteError;
  meta: Meta;
  params: Record<string, string>;
  route: Page;
  url: URL;
  source: string;
}

export type InnerRenderFunction = () => Promise<RouteRenderResult>;

export class InnerRenderContext {
  #bootstrap: ScriptDescriptor[];
  #id: string;
  #meta: Meta = {};
  #route: string;
  #source: string;
  #state: Map<string, unknown> = new Map();
  #url: URL;

  constructor(
    bootstrap: ScriptDescriptor[],
    id: string,
    meta: Meta,
    route: string,
    url: URL,
    source: string
  ) {
    this.#bootstrap = bootstrap;
    this.#id = id;
    this.#meta = meta;
    this.#route = route;
    this.#url = url;
    this.#source = source;
  }

  get bootstrap(): ScriptDescriptor[] {
    return this.#bootstrap;
  }

  /** A unique ID for this logical JIT render. */
  get id(): string {
    return this.#id;
  }

  /**
   * State that is persisted between multiple renders with the same render
   * context. This is useful because one logical JIT render could have multiple
   * preact render passes due to suspense.
   */
  get state(): Map<string, unknown> {
    return this.#state;
  }

  get meta(): Meta {
    return this.#meta;
  }

  /** The URL of the page being rendered. */
  get url(): URL {
    return this.#url;
  }

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  get route(): string {
    return this.#route;
  }

  get source(): string {
    return this.#source;
  }
}

function defaultCsp() {
  return {
    directives: { defaultSrc: [NONE], styleSrc: [UNSAFE_INLINE] },
    reportOnly: false,
  };
}

/**
 * This function renders out a page. Rendering is synchronous and non streaming.
 * Suspense boundaries are not supported.
 */
export async function internalRender<Data>(
  opts: InnerRenderOptions<Data>,
  renderPage: RenderPage
): Promise<[RouteRenderResult, ContentSecurityPolicy | undefined]> {
  const csp: ContentSecurityPolicy | undefined = opts.route.csp
    ? defaultCsp()
    : undefined;

  const ctx = new InnerRenderContext(
    opts.bootstrap,
    crypto.randomUUID(),
    opts.meta,
    opts.route.pathname,
    opts.url,
    opts.source
  );

  if (csp) {
    // Clear the csp
    const newCsp = defaultCsp();
    csp.directives = newCsp.directives;
    csp.reportOnly = newCsp.reportOnly;
  }

  let children;
  await renderPage(ctx, async () => {
    const route = opts.route as Page;
    const renderContext = {
      data: opts.data as Data,
      error: opts.error,
      meta: ctx.meta,
      module: route.module,
      params: opts.params,
      route: route.pathname,
      url: opts.url,
    };
    children = (await route.render(renderContext)) as RouteRenderResult;
    return children;
  });

  if (!children) {
    throw new Error(
      `The 'render' function was not called by route's render hook.`
    );
  }

  // const moduleScripts: [string, string][] = [];
  // for (const url of opts.imports) {
  //   const randomNonce = crypto.randomUUID().replace(/-/g, "");
  //   if (csp) {
  //     csp.directives.scriptSrc = [
  //       ...(csp.directives.scriptSrc ?? []),
  //       nonce(randomNonce),
  //     ];
  //   }
  //   moduleScripts.push([url, randomNonce]);
  // }
  const props: LayoutComponentProps = {
    bootstrap: ctx.bootstrap,
    meta: ctx.meta,
    children,
  };
  const layoutContext: WidgetRenderContext = {
    data: props,
    meta: ctx.meta,
    module: {
      default: layout.default,
    },
  };
  const html = await layout.render(layoutContext);

  return [html, csp];
}
