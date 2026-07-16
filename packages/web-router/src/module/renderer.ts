import { mergeMeta, rebaseMeta } from '@web-widget/helpers/module';
import type {
  HTTPException,
  LayoutComponentProps,
  LayoutModule,
  Meta,
  RouteComponentProps,
  RouteContext,
  RouteModule,
  ServerRenderOptions,
} from '../types';
import type { ModuleLoaderCache, ModuleSource } from './loader';

export type DevMetaProvider = (
  context: RouteContext
) => Promise<Meta | void> | Meta | void;

export interface RenderCacheData {
  meta: Meta;
  renderer: ServerRenderOptions;
  render: RouteContext['render'];
  html: RouteContext['html'];
}

interface RendererOptions {
  layoutModule: ModuleSource<LayoutModule>;
  defaultMeta: Meta;
  defaultBaseAsset: string;
  defaultRenderer: ServerRenderOptions;
  exposeErrors?: boolean;
}

type SafeError = { proxy: true } & HTTPException;

export class ModuleRenderer {
  #loadLayout: () => Promise<LayoutModule>;
  #defaultMeta: Meta;
  #defaultBaseAsset: string;
  #defaultRenderer: ServerRenderOptions;
  #exposeErrors: boolean;
  #devMeta?: DevMetaProvider;

  constructor(options: RendererOptions, loaders: ModuleLoaderCache) {
    this.#loadLayout = loaders.get(options.layoutModule);
    this.#defaultMeta = options.defaultMeta;
    this.#defaultBaseAsset = options.defaultBaseAsset;
    this.#defaultRenderer = options.defaultRenderer;
    this.#exposeErrors = options.exposeErrors ?? false;
  }

  setDevMetaProvider(provider: DevMetaProvider): void {
    this.#devMeta = provider;
  }

  async createRenderData(module: RouteModule): Promise<RenderCacheData> {
    const layoutModule = await this.#loadLayout();
    return {
      meta: mergeMeta(
        this.#defaultMeta,
        rebaseMeta(module.meta ?? {}, this.#defaultBaseAsset)
      ),
      renderer: this.#defaultRenderer,
      render: this.#composeRender(layoutModule),
      html: this.#composeHtml(layoutModule),
    };
  }

  async #renderToResponse(
    context: RouteContext,
    layoutModule: LayoutModule,
    data: unknown,
    unsafeError: HTTPException | undefined,
    meta: Meta,
    renderer: ServerRenderOptions,
    responseInit?: ResponseInit
  ) {
    if (typeof layoutModule.render !== 'function') {
      throw new TypeError(`Layout module is missing export "render" function.`);
    }
    if (!context.module) {
      throw new TypeError(`Context is missing "module".`);
    }
    if (typeof context.module.render !== 'function') {
      throw new TypeError(`Module is missing export "render" function.`);
    }

    const error = unsafeError
      ? this.#exposeErrors
        ? unsafeError
        : this.#createSafeError(unsafeError)
      : undefined;

    if (this.#devMeta) {
      try {
        const devMeta = await this.#devMeta(context);
        if (devMeta) {
          meta = mergeMeta(meta, devMeta);
        }
      } catch {
        // Dev meta injection is best-effort; don't fail the render.
      }
    }

    const componentProps: RouteComponentProps = {
      data,
      error,
      meta,
      name: context.name,
      params: context.params,
      pathname: context.pathname,
      request: context.request,
      state: context.state,
    };
    const component =
      error && context.module.fallback
        ? context.module.fallback
        : context.module.default;
    const renderProps =
      error && context.module.fallback
        ? this.#createSerializableError(error)
        : componentProps;

    const children = await context.module.render(
      component,
      renderProps,
      renderer
    );
    const layoutContext: LayoutComponentProps = {
      children,
      ...componentProps,
    };
    const html = await layoutModule.render(
      layoutModule.default,
      layoutContext,
      renderer
    );
    const status =
      responseInit?.status ??
      (error ? (error.status ? error.status : 500) : 200);
    const statusText =
      responseInit?.statusText ??
      (error
        ? error.statusText
          ? error.statusText
          : 'Internal Server Error'
        : 'OK');
    const headers = new Headers(responseInit?.headers);

    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/html; charset=utf-8');
    }
    if (renderer?.progressive) {
      headers.set('x-accel-buffering', 'no');
      if (!headers.has('cache-control')) {
        headers.set('cache-control', 'no-store, no-transform');
      }
    }

    return new Response(html, { status, statusText, headers });
  }

  #composeRender(layoutModule: LayoutModule): RouteContext['render'] {
    const renderer = this;
    return async function render(
      this: RouteContext,
      { data = this.data, error = this.error, meta = this.meta } = {},
      { headers, status, statusText, ...options } = this.renderOptions
    ) {
      return renderer.#renderToResponse(
        this,
        layoutModule,
        data,
        error,
        meta,
        options,
        { headers, status, statusText }
      );
    };
  }

  #composeHtml(layoutModule: LayoutModule): RouteContext['html'] {
    const renderer = this;
    return async function html(
      this: RouteContext,
      data = this.data,
      {
        error = this.error,
        meta = this.meta,
        renderer: options = this.renderer,
        ...responseInit
      } = {}
    ) {
      return renderer.#renderToResponse(
        this,
        layoutModule,
        data,
        error,
        meta,
        options,
        responseInit
      );
    };
  }

  #createSerializableError(error: HTTPException) {
    return {
      name: error.name || 'Error',
      message: error.message || 'An error occurred',
      stack: error.stack || '',
      status: error.status || 500,
      statusText: error.statusText || 'Internal Server Error',
      cause: error.cause,
    };
  }

  #createSafeError(error: HTTPException | SafeError): HTTPException {
    if ((error as SafeError).proxy) {
      return error as HTTPException;
    }
    const safeError = new Proxy(error, {
      get(target, key) {
        if (key === 'stack' || key === 'cause') {
          return '';
        }
        return Reflect.get(target, key);
      },
    }) as SafeError;
    safeError.proxy = true;
    return safeError;
  }
}
