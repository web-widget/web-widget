import type {
  Layout,
  LayoutRenderContext,
  Page,
  RootLayoutComponentProps,
  RootRender,
} from "./types";
import type {
  Meta,
  RouteRenderContext,
  RouteRenderOptions,
  RouteRenderResult,
  ScriptDescriptor,
} from "@web-widget/schema/server-helpers";
import { NONE, UNSAFE_INLINE } from "./csp";

import type { ContentSecurityPolicy } from "./csp";

export class RootRenderContext {
  #bootstrap: ScriptDescriptor[];
  #id: string;
  #meta: Meta = {};
  #pathname: string;
  #renderOptions: RouteRenderOptions = {};
  #request: Request;
  #source: URL;
  #state: Map<string, unknown> = new Map();

  constructor(
    bootstrap: ScriptDescriptor[],
    id: string,
    meta: Meta,
    pathname: string,
    renderOptions: RouteRenderOptions,
    request: Request,
    source: URL
  ) {
    this.#bootstrap = bootstrap;
    this.#id = id;
    this.#meta = meta;
    this.#pathname = pathname;
    this.#renderOptions = renderOptions;
    this.#request = request;
    this.#source = source;
  }

  get bootstrap(): ScriptDescriptor[] {
    return this.#bootstrap;
  }

  get id(): string {
    return this.#id;
  }

  get state(): Map<string, unknown> {
    return this.#state;
  }

  get meta(): Meta {
    return this.#meta;
  }

  get renderOptions(): RouteRenderOptions {
    return this.#renderOptions;
  }

  get request(): Request {
    return this.#request;
  }

  /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */
  get pathname(): string {
    return this.#pathname;
  }

  get source(): URL {
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
export async function internalRender(
  renderContext: RouteRenderContext,
  renderOptions: RouteRenderOptions,
  page: Page,
  rootRender: RootRender,
  rootLayout: Layout
): Promise<[RouteRenderResult, ContentSecurityPolicy | undefined]> {
  const csp: ContentSecurityPolicy | undefined = page.csp
    ? defaultCsp()
    : undefined;

  const rootRenderCtx = new RootRenderContext(
    page.bootstrap,
    crypto.randomUUID(),
    renderContext.meta,
    page.pathname,
    renderOptions,
    renderContext.request,
    page.source
  );

  if (csp) {
    // Clear the csp
    const newCsp = defaultCsp();
    csp.directives = newCsp.directives;
    csp.reportOnly = newCsp.reportOnly;
  }

  let children;
  await rootRender(rootRenderCtx, async () => {
    children = await page.render(renderContext, rootRenderCtx.renderOptions);

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
  const props: RootLayoutComponentProps = {
    bootstrap: rootRenderCtx.bootstrap,
    meta: rootRenderCtx.meta,
    children,
  };
  const layoutContext: LayoutRenderContext = {
    data: props,
    meta: rootRenderCtx.meta,
    module: rootLayout.module,
  };
  const html = await rootLayout.render(
    layoutContext,
    rootRenderCtx.renderOptions
  );

  return [html, csp];
}
