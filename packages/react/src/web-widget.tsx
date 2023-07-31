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
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*?)["']\)/;

function getFilename(loader: Loader) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];
  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }
  return id;
}

// async function readableStreamToString(
//   readableStream: ReadableStream<Uint8Array>
// ) {
//   let result = "";
//   const textDecoder = new TextDecoder();

//   // @ts-ignore
//   for await (const chunk of readableStream) {
//     result += textDecoder.decode(chunk);
//   }

//   return result;
// }

// https://github.com/passiv/snaptrade-sdks/blob/46b3cac3155f16be9f739068973c6a18802bd50f/sdks/typescript/error.ts#L76
async function readableStreamToString(stream: ReadableStream) {
  // Step 1: Create a new TextDecoder
  const decoder = new TextDecoder();

  // Step 2: Create a new ReadableStreamDefaultReader
  const reader = stream.getReader();

  // Step 3: Initialize an empty string to hold the result
  let result = "";

  try {
    while (true) {
      // Step 4: Read data from the stream
      const { done, value } = await reader.read();

      // If there is no more data to read, break the loop
      if (done) break;

      // Convert the chunk of data to a string using the TextDecoder
      const chunk = decoder.decode(value, { stream: true });

      // Concatenate the chunk to the result
      result += chunk;
    }
  } finally {
    // Step 5: Release the ReadableStreamDefaultReader when done or in case of an error
    reader.releaseLock();
  }

  // Return the final result as a string
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
