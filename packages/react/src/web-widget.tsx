import type { ReactNode } from "react";
import { Suspense, lazy, createElement } from "react";
import type { RenderContext, RenderResult } from "@web-widget/web-server";

export const __ENV__ = {
  server: true,
};

const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*?)["']\)/;

function getFilename(loader: Loader) {
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

type Loader = () => Promise<{
  render: (context: RenderContext<JSONValue>) => Promise<RenderResult>;
  default?: any;
}>;

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
  const attrs = {
    base,
    data: JSON.stringify(data),
    import: url,
    loading,
    name,
    rendertarget: "light",
  };

  if (recovering) {
    Object.assign(attrs, {
      recovering: "",
    });
  }

  return createElement("web-widget", {
    ...attrs,
    dangerouslySetInnerHTML: { __html: innerHTML },
  });
}

export async function renderServerWebWidget(loader: Loader, data: any) {
  const module = await loader();
  if (typeof module.render !== "function") {
    const url = getFilename(loader);
    throw new Error(`The module does not export a 'render' method: ${url}`);
  }

  const component = module.default;
  const result = await module.render({
    component,
    data,
  } as RenderContext<JSONValue>);

  if (result instanceof ReadableStream) {
    return await streamToString(result);
  } else if (typeof result === "string") {
    return result;
  } else {
    const url = getFilename(loader);
    throw new Error(`Render results in an unknown format: ${url}`);
  }
}

export interface WebWidgetProps extends WebWidgetClientProps {
  fallback?: ReactNode;
  children?: ReactNode | undefined;
  loader?: Loader;
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

    if (__ENV__.server && recovering && loader) {
      innerHTML = await renderServerWebWidget(loader, data);
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
  loader: Loader,
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
  loader: Loader,
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
  loader: Loader,
  base: string,
  { loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, base, {
    loading,
    name,
    recovering: false,
  });
}
