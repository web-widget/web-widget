import type { ReactNode } from "react";
import { Suspense, lazy, createElement } from "react";
//import { resolve } from "import-meta-resolve";

// @ts-expect-error
const DEV = import.meta?.env?.DEV;
// @ts-expect-error
const BASE_URL = import.meta.env?.BASE_URL || "/";
// @ts-expect-error
const WEB_WIDGET_BASE_URL = import.meta.env?.WEB_WIDGET_BASE_URL || BASE_URL;

const RELATIVE_PATH_REG = /^\.\.?\//;

// __vite_ssr_dynamic_import__: https://github.com/vitejs/vite/blob/45c6f3b7601afcb8fccf25864703ee6b50a10da8/packages/vite/src/node/ssr/ssrTransform.ts#L33
const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*?)["']\)/;

async function streamToString(stream: ReadableStream): Promise<string> {
  const chunks: Array<any> = [];
  // @ts-expect-error
  for await (let chunk of stream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return buffer.toString("utf-8");
}

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

export interface WebWidgetClientProps {
  base: string;
  data: JSONProps;
  import: string;
  innerHTML?: string;
  loading?: string;
  name?: string;
  recovering: boolean;
}

export function WebWidgetClient({
  base,
  data,
  import: url,
  innerHTML = "",
  loading,
  name,
  recovering,
}: WebWidgetClientProps) {
  return createElement("web-widget", {
    base,
    data: JSON.stringify(data),
    import: url,
    loading,
    name,
    recovering,
    rendertarget: "light",
    dangerouslySetInnerHTML: { __html: innerHTML },
  });
}

export interface WebWidgetProps extends WebWidgetClientProps {
  fallback?: ReactNode;
  children?: ReactNode | undefined;
}

export function WebWidget({
  base,
  data,
  fallback,
  import: url,
  loading,
  name,
  recovering,
  children,
}: WebWidgetProps) {
  if (!base) {
    throw new Error(`Missing base`);
  }

  const src = RELATIVE_PATH_REG.test(url) ? base + url : url;

  if (children) {
    throw new Error(`No support for 'children'`);
  }

  const WebWidgetClientFactory = lazy<any>(async () => {
    let innerHTML = "";

    if (recovering) {
      const module = await import(/* @vite-ignore */ src);

      if (typeof module.render !== "function") {
        throw new Error(`The module does not export a 'render' method: ${src}`);
      }

      const component = module.default;
      name = name || component?.name;
      const result = await module.render({
        component,
        data: data,
      });

      if (result instanceof ReadableStream) {
        innerHTML = await streamToString(result);
      } else if (typeof result === "string") {
        innerHTML = result;
      } else {
        throw new Error(`Render results in an unknown format: ${src}`);
      }
    }

    return {
      default: function WebWidgetClientFactory() {
        return (
          <WebWidgetClient
            {...{
              base,
              data,
              import: url,
              loading,
              name,
              innerHTML,
              recovering,
            }}
          />
        );
      },
    };
  });

  return (
    <Suspense fallback={fallback}>
      <WebWidgetClientFactory />
    </Suspense>
  );
}

type WebWidgetFactoryProps = JSONProps & {
  children?: ReactNode;
  fallback?: ReactNode;
};

export interface DefineWebWidgetOptions {
  base?: string;
  loading?: string;
  name?: string;
  recovering?: boolean;
}

export function defineWebWidget(
  // TODO 使用 loader 的返回类型
  loader: () => Promise<any>,
  importer: string,
  {
    base = WEB_WIDGET_BASE_URL,
    loading,
    name,
    recovering = true,
  }: DefineWebWidgetOptions = {}
) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];

  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }

  const url = RELATIVE_PATH_REG.test(id) ? new URL(id, importer).href : id;

  return function WebWidgetFactory({
    children,
    fallback,
    ...data
  }: WebWidgetFactoryProps) {
    return (
      <WebWidget
        {...{
          base,
          data,
          fallback,
          import: url,
          loading,
          name,
          recovering,
        }}>
        {children}
      </WebWidget>
    );
  };
}

export interface ClientOptions {
  base?: string;
  loading?: "lazy";
  name?: string;
}

export function defineClient(
  loader: () => Promise<any>,
  importer: string,
  { base, loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, importer, {
    base,
    loading,
    name,
    recovering: true,
  });
}

export function defineClientOnly(
  loader: () => Promise<any>,
  importer: string,
  { base, loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, importer, {
    base,
    loading,
    name,
    recovering: false,
  });
}
