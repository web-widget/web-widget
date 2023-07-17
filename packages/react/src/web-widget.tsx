import type { ReactNode } from "react";
import { Suspense, lazy, createElement } from "react";
import type { RenderContext, RenderResult } from "@web-widget/web-server";

const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*?)["']\)/;

function getFilename(loader: () => Promise<any>) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];
  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }
  return id;
}

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
  loader?: () => Promise<{
    render: (context: RenderContext<JSONValue>) => Promise<RenderResult>;
    default?: any;
  }>;
}

export function WebWidget({
  base,
  children,
  data,
  fallback,
  import: url,
  loader,
  loading,
  name,
  recovering,
}: WebWidgetProps) {
  if (!base) {
    throw new Error(`Missing base`);
  }

  if (children) {
    throw new Error(`No support for 'children'`);
  }

  if (recovering && !loader) {
    throw new Error(`Missing loader`);
  }

  const WebWidgetClientFactory = lazy<any>(async () => {
    let innerHTML = "";

    if (recovering && loader) {
      const module = await loader();
      if (typeof module.render !== "function") {
        throw new Error(`The module does not export a 'render' method: ${url}`);
      }

      const component = module.default;
      name = name || component?.name;
      const result = await module.render({
        component,
        data,
      } as RenderContext<JSONValue>);

      if (result instanceof ReadableStream) {
        innerHTML = await streamToString(result);
      } else if (typeof result === "string") {
        innerHTML = result;
      } else {
        throw new Error(`Render results in an unknown format: ${url}`);
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
  loading?: string;
  name?: string;
  recovering?: boolean;
}

export function defineWebWidget(
  // TODO 使用 loader 的返回类型
  loader: () => Promise<any>,
  base: string,
  { loading, name, recovering = true }: DefineWebWidgetOptions = {}
) {
  const url = getFilename(loader);
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
          loader,
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
  loading?: "lazy";
  name?: string;
}

export function defineClient(
  loader: () => Promise<any>,
  base: string,
  { loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, base, {
    loading,
    name,
    recovering: true,
  });
}

export function defineClientOnly(
  loader: () => Promise<any>,
  base: string,
  { loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, base, {
    loading,
    name,
    recovering: false,
  });
}
