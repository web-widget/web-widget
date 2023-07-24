import type {
  LinkDescriptor,
  Meta,
  MetaDescriptor,
  RouteComponent,
  RouteComponentProps,
  RouteFallbackComponent,
  RouteFallbackComponentProps,
  RouteRenderContext,
  ScriptDescriptor,
  StyleDescriptor,
  WidgetComponent,
  WidgetComponentProps,
  WidgetFallbackComponent,
  WidgetFallbackComponentProps,
  WidgetRenderContext,
} from "./schema";

// @ts-ignore
const DEV = import.meta.env?.DEV;

// type EscapeLookupKey = "&" | ">" | "<" | "\u2028" | "\u2029";
// const ESCAPE_LOOKUP = {
//   "&": "\\u0026",
//   ">": "\\u003e",
//   "<": "\\u003c",
//   "\u2028": "\\u2028",
//   "\u2029": "\\u2029",
// };

// const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

type TerminatorsLookupKey = "\u2028" | "\u2029";
const TERMINATORS_LOOKUP = {
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const TERMINATORS_REGEX = /[\u2028\u2029]/g;

// function escaper(match: EscapeLookupKey) {
//   return ESCAPE_LOOKUP[match];
// }

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
/**
 * Properly escape JSON for usage as an object literal inside of a `<script>` tag.
 * JS implementation of http://golang.org/pkg/encoding/json/#HTMLEscape
 * More info: http://timelessrepo.com/json-isnt-a-javascript-subset
 * https://github.com/zertosh/htmlescape/blob/master/htmlescape.js
 */
// function safeJSON(obj: any): string {
//   return JSON.stringify(obj).replace(ESCAPE_REGEX, escaper as () => string);
// }

function safeHTML(str: string): string {
  return str.replace(TERMINATORS_REGEX, function sanitizer(match) {
    return TERMINATORS_LOOKUP[match as TerminatorsLookupKey];
  });
}

const safeAttributeName = (value: string) =>
  safeHTML(String(value)).toLowerCase();
const safeAttributeValue = (value: string) => safeHTML(String(value));

const createAttributes = (attrs: Record<string, string | undefined>) =>
  Object.entries(attrs)
    .map(([attrName, attrValue]) =>
      typeof attrValue === "string"
        ? `${safeAttributeName(attrName)}${
            attrValue === "" ? "" : '="' + safeAttributeValue(attrValue) + '"'
          }`
        : ""
    )
    .join(" ");

function createElement(
  name: string,
  attributes: Record<string, string | undefined>,
  children?: string
): string {
  return typeof children === "string"
    ? `<${name} ${createAttributes(attributes)}>${children}</${name}>`
    : `<${name} ${createAttributes(attributes)} />`;
}

function createText(data: string) {
  return safeHTML(data);
}

export function renderMetaToString(meta: Meta): string {
  const priority: string[][] = [[], [], []];
  Array.from(Object.entries(meta)).forEach(([key, value]) => {
    if (key === "base") {
      // NOTE: this element must come before other elements with attribute values of URLs,
      // such as <link>'s href attribute.
      return priority[0].push(
        createElement(key, {
          href: value,
        })
      );
    }

    if (key === "title") {
      return priority[0].push(createElement(key, {}, createText(value)));
    }

    if (key === "description" || key === "keywords") {
      return priority[0].push(
        createElement("meta", { name: key, content: value })
      );
    }

    if (key === "link") {
      return (value as LinkDescriptor[]).forEach((props) =>
        priority[2].push(createElement(key, props as Record<string, string>))
      );
    }

    if (key === "meta") {
      return (value as MetaDescriptor[]).forEach((props) =>
        priority[0].push(createElement(key, props as Record<string, string>))
      );
    }

    if (key === "script") {
      return (value as ScriptDescriptor[]).forEach(
        ({ content = "", ...props }) => {
          // NOTE: Importmap must precede link[rel=modulepreload] elements
          priority[props?.type === "importmap" ? 1 : 2].push(
            createElement(key, props, createText(content))
          );
        }
      );
    }

    if (key === "style") {
      return (value as StyleDescriptor[]).forEach(
        ({ content = "", ...props }) =>
          priority[2].push(createElement(key, props, createText(content)))
      );
    }
  });

  return priority.flat().join("");
}

export function getComponent(
  opts: WidgetRenderContext | RouteRenderContext
):
  | RouteFallbackComponent
  | RouteComponent
  | WidgetFallbackComponent
  | WidgetComponent {
  if (opts?.error) {
    const component = opts.module?.fallback;

    if (component === undefined) {
      throw new Error(`No renderable fallback-component.`);
    }

    return component;
  } else {
    const component = opts?.module?.default;
    if (component === undefined) {
      throw new Error("No renderable component.");
    }

    return component;
  }
}

export function getComponentProps(
  opts: WidgetRenderContext | RouteRenderContext
) {
  let props:
    | RouteFallbackComponentProps
    | RouteComponentProps
    | WidgetFallbackComponentProps
    | WidgetComponentProps;
  const isRoute = Reflect.has(opts, "route");
  const error = opts.error;

  if (isRoute) {
    const { data, params, route, url } = opts as RouteRenderContext;

    if (error) {
      const isLikeHTTPError =
        Reflect.has(error, "status") && Reflect.has(error, "statusText");
      props = (
        isLikeHTTPError
          ? {
              name: "RouteError",
              status: (error as Response).status,
              statusText: (error as Response).statusText,
            }
          : {
              name: (error as Error).name,
              message: (error as Error).message,
              stack: DEV ? (error as Error).stack : undefined,
            }
      ) as RouteFallbackComponentProps;
    } else {
      props = {
        data,
        params,
        route,
        url,
      } as RouteComponentProps;
    }
  } else {
    if (error) {
      props = {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      } as WidgetFallbackComponentProps;
    } else {
      props = opts.data as WidgetComponentProps;
    }
  }

  return props;
}
