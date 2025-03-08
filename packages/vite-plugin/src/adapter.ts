import type {
  Loader,
  RouteRenderContext,
  RouteRenderOptions,
  RouteRenderResult,
  WebWidgetRendererOptions,
  WidgetRenderContext,
  WidgetRenderOptions,
  WidgetRenderResult,
} from '@web-widget/web-widget';
import { WebWidgetUserConfig } from './types';

export type File = {
  workspace: string;
  name: string;
  signature: string;
  extension: string;
  search: string;
};

export type WebWidgetAdapterModule = {
  importer?: Importer;
  exporter?: Exporter;
  extensions?: string[];
  compilerOptions: CompilerOptions;
};

export type Importer<Component = unknown> = (
  loader: Loader,
  options: Partial<
    Pick<
      WebWidgetRendererOptions,
      'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
    >
  >
) => Component;

export type Exporter<Data = unknown, Params = Record<string, string>> = () =>
  | ((
      context: WidgetRenderContext<Data>,
      renderOptions: WidgetRenderOptions
    ) => Promise<WidgetRenderResult>)
  | ((
      context: RouteRenderContext<Data, Params>,
      renderOptions: RouteRenderOptions
    ) => Promise<RouteRenderResult>);

export type CompilerOptions = {
  workspace?: string;
  signature?: string;
  extension: string;
};

export type WebWidgetAdapterPluginOptions = {
  plugins: string[];
};

export async function webWidgetAdapterPlugin(
  pluginName: string,
  options: {
    manifest?: WebWidgetUserConfig['manifest'];
  } = {}
): Promise<WebWidgetUserConfig> {
  const module: WebWidgetAdapterModule = await import(pluginName);
  const { compilerOptions } = module;
  if (!compilerOptions) {
    throw new TypeError(`compilerOptions is required.`);
  }

  if (!compilerOptions.extension) {
    throw new TypeError(`compilerOptions.extension is required.`);
  }

  const workspace =
    (compilerOptions.workspace ?? `*`) === '*'
      ? `**/`
      : `${compilerOptions.workspace}/**/`;
  const name = `*`;
  const signature = `{${compilerOptions.signature ?? '@route,@widget,.route,.widget'}}`;
  const extension = `{${compilerOptions.extension}}`;
  const search = `{,\\?*}`;

  return {
    provide: pluginName,
    manifest: options.manifest,
    export: {
      include: filePattern({
        workspace,
        name,
        signature,
        extension,
        search,
      }),
    },
    import: {
      include: filePattern({
        workspace,
        name,
        signature,
        extension: '.*',
      }),
      includeImporter: filePattern({
        workspace,
        name,
        extension,
        search,
      }),
    },
  };
}

function filePattern({
  workspace = '',
  name = '',
  signature = '',
  extension = '',
  search = '',
}: Partial<File>) {
  return `${workspace}${name}${signature}${extension}${search}`;
}
