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
  meta: Meta[];
  params: Record<string, string>;
  route: Route<Data> | UnknownPage | ErrorPage;
  url: URL;
}

export type InnerRenderFunction = () => Promise<RenderResult>;

export class InnerRenderContext {
  #id: string;
  #importmap: Record<string, any> = {};
  #lang: string;
  #links: string[] | Record<string, string>[] = [];
  #meta: Meta[] = [];
  #route: string;
  #state: Map<string, unknown> = new Map();
  #styles: string[] | Record<string, string>[] = [];
  #url: URL;

  constructor(id: string, url: URL, route: string, lang: string, meta: Meta[]) {
    this.#id = id;
    this.#url = url;
    this.#route = route;
    this.#lang = lang;
    this.#meta.push(...meta);
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

  /**
   * All of the CSS style rules that should be inlined into the document.
   * Adding to this list across multiple renders is supported (even across
   * suspense!). The CSS rules will always be inserted on the client in the
   * order specified here.
   */
  get styles(): string[] | Record<string, string>[] {
    return this.#styles;
  }

  get links(): string[] | Record<string, string>[] {
    return this.#links;
  }

  get meta(): Meta[] {
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

  /** The language of the page being rendered. Defaults to "en". */
  get lang(): string {
    return this.#lang;
  }
  set lang(lang: string) {
    this.#lang = lang;
  }

  get importmap() {
    return this.#importmap;
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
    opts.url,
    opts.route.pathname,
    opts.lang ?? "en",
    opts.meta
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
    meta: ctx.meta,
    outlet,
    clientEntry: "@web-widget/web-server/client",
    esModulePolyfillUrl:
      "https://ga.jspm.io/npm:es-module-shims@1.7.3/dist/es-module-shims.js",
    importmap: ctx.importmap,
    styles: ctx.styles,
    links: ctx.links,
    lang: ctx.lang,
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
