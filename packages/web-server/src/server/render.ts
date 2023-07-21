import * as layout from "./layout.default";
import type {
  ErrorPage,
  Meta,
  RenderContext,
  RenderPage,
  RenderResult,
  Route,
  UnknownPage,
} from "./types";
import { nonce, NONE, UNSAFE_INLINE, ContentSecurityPolicy } from "./csp";

export interface InnerRenderOptions<Data> {
  data?: Data;
  error?: unknown;
  imports: string[];
  lang?: string;
  meta: Meta;
  params: Record<string, string>;
  route: Route<Data> | UnknownPage | ErrorPage;
  url: URL;
}

export type InnerRenderFunction = () => Promise<RenderResult>;

export class InnerRenderContext {
  #id: string;
  #meta: Meta = {};
  #route: string;
  #state: Map<string, unknown> = new Map();
  #url: URL;

  constructor(id: string, meta: Meta, route: string, url: URL) {
    this.#id = id;
    this.#meta = meta;
    this.#route = route;
    this.#url = url;
  }

  clientEntry = "@web-widget/web-server/client";

  esModulePolyfillUrl =
    "https://ga.jspm.io/npm:es-module-shims@1.7.3/dist/es-module-shims.js";

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
): Promise<[RenderResult, ContentSecurityPolicy | undefined]> {
  const csp: ContentSecurityPolicy | undefined = opts.route.csp
    ? defaultCsp()
    : undefined;

  const ctx = new InnerRenderContext(
    crypto.randomUUID(),
    opts.meta,
    opts.route.pathname,
    opts.url
  );

  if (csp) {
    // Clear the csp
    const newCsp = defaultCsp();
    csp.directives = newCsp.directives;
    csp.reportOnly = newCsp.reportOnly;
  }

  let outlet: RenderResult | null = null;
  await renderPage(ctx, async () => {
    const renderContext: RenderContext = {
      component: opts.route.component,
      data: opts.data,
      error: opts.error,
      meta: ctx.meta,
      params: opts.params,
      route: opts.route.pathname,
      url: opts.url,
    };
    outlet = await opts.route.render(renderContext);
    return outlet;
  });

  if (!outlet) {
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

  const data = {
    clientEntry: ctx.clientEntry,
    esModulePolyfillUrl: ctx.esModulePolyfillUrl,
    meta: ctx.meta,
    outlet,
  };
  const layoutContext: RenderContext = {
    component: layout.default,
    data,
    error: null,
    meta: ctx.meta,
    params: opts.params,
    route: opts.route.pathname,
    url: opts.url,
  };
  const html = await layout.render(layoutContext);

  return [html, csp];
}
