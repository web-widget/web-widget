import type {
  Meta,
  ServerWidgetModule,
  WidgetModule,
} from "@web-widget/schema";
import { Suspense, createElement, lazy } from "react";

import type { ReactNode } from "react";

export const __ENV__ = {
  server: true,
};

const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*)["']\)/;

function getFilename(loader: Loader) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];
  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }
  return id;
}

// async function readableStreamToString(
//   readableStream: ReadableStream
// ) {
//   let result = "";
//   const textDecoder = new TextDecoder();

//   for await (const chunk of readableStream) {
//     result += textDecoder.decode(chunk, { stream: true });
//   }

//   return result;
// }

async function readableStreamToString(stream: ReadableStream) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let result = "";

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      result += chunk;
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

type Loader = () => Promise<WidgetModule>;

export interface WebWidgetClientProps {
  base?: string;
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

  if (recovering && typeof recovering !== "string") {
    Object.assign(attrs, {
      recovering: "",
    });
  }

  return createElement("web-widget", {
    ...attrs,
    dangerouslySetInnerHTML: { __html: innerHTML },
  });
}

export async function renderServerWidget(loader: Loader, data: any) {
  const module = (await loader()) as ServerWidgetModule;
  if (typeof module.render !== "function") {
    const url = getFilename(loader);
    throw new Error(`The module does not export a 'render' method: ${url}`);
  }

  const result = await module.render({
    meta: module.meta ?? ({} as Meta), // TODO 处理 Meta 中的相对路径资产
    module,
    data,
  });

  if (result instanceof ReadableStream) {
    return await readableStreamToString(result);
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
  if (children) {
    throw new Error(`No support for 'children'`);
  }

  if (recovering && !loader) {
    throw new Error(`Missing loader`);
  }

  const WebWidgetClientFactory = lazy<any>(async () => {
    let innerHTML = "";

    if (__ENV__.server && recovering && loader) {
      innerHTML = await renderServerWidget(loader, data);
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
  import?: string;
  loading?: string;
  name?: string;
  recovering?: boolean;
}

export const ASSET_PLACEHOLDER = "asset://";

export function defineWebWidget(
  // TODO 使用 loader 的返回类型
  loader: Loader,
  {
    base,
    import: url,
    loading,
    name,
    recovering = true,
  }: DefineWebWidgetOptions
) {
  const clientImport =
    url && !url.startsWith(ASSET_PLACEHOLDER) ? url : getFilename(loader);
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
          import: clientImport,
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
  base?: string;
  loading?: "lazy";
  name?: string;
}

export function defineClient(
  loader: Loader,
  { base, loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, {
    base,
    loading,
    name,
    recovering: true,
  });
}

export function defineClientOnly(
  loader: Loader,
  { base, loading, name }: ClientOptions = {}
) {
  return defineWebWidget(loader, {
    base,
    loading,
    name,
    recovering: false,
  });
}
