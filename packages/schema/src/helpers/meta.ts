import type {
  LinkDescriptor,
  Meta,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from "../types";

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
      return priority[0].push(createElement(key, value));
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

export function rebaseMeta(meta: Meta, base: string): Meta {
  const RESOLVE_URL_REG = /^(?:\w+:)?\//;
  return {
    ...meta,

    link: (meta.link ?? []).map((props) => {
      if (props.href && !RESOLVE_URL_REG.test(props.href)) {
        return {
          ...props,
          href: base + props.href,
        };
      }
      return { ...props };
    }),

    script: (meta.script ?? []).map((props) => {
      type Imports = Record<string, string>;
      type Scopes = Record<string, Imports>;
      type Importmap = {
        imports?: Imports;
        scopes?: Scopes;
      };

      if (props.type === "importmap" && typeof props.content === "string") {
        const importmap = JSON.parse(props.content) as Importmap;
        const rebaseImports = (imports: Imports) =>
          Object.entries(imports).reduce((previousValue, [name, url]) => {
            if (!RESOLVE_URL_REG.test(url)) {
              previousValue[name] = base + url;
            } else {
              previousValue[name] = url;
            }
            return previousValue;
          }, {} as Imports);

        return {
          ...props,
          content: JSON.stringify({
            imports: importmap.imports ? rebaseImports(importmap.imports) : {},
            scopes: importmap.scopes
              ? Object.entries(importmap.scopes).reduce(
                  (previousValue, [scope, imports]) => {
                    if (!RESOLVE_URL_REG.test(scope)) {
                      previousValue[base + scope] = rebaseImports(imports);
                    } else {
                      previousValue[scope] = {};
                    }
                    return previousValue;
                  },
                  {} as Scopes
                )
              : {},
          } as Importmap),
        };
      }

      if (typeof props.src === "string" && !RESOLVE_URL_REG.test(props.src)) {
        return {
          ...props,
          src: base + props.src,
        };
      }

      return { ...props };
    }),
  };
}

export function mergeMeta(defaults: Meta, overrides: Meta): Meta {
  const meta: Record<string, string | Record<string, string>[]> = {};

  Object.entries(defaults).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      meta[key] = value.map((value) => ({ ...value }));
    } else {
      meta[key] = value;
    }
  });

  Object.entries(overrides).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (!Array.isArray(meta[key])) {
        meta[key] = value;
        return;
      }
      const targetValue = meta[key] as Record<string, string>[];
      const targetKeys = targetValue.map((value) => Object.keys(value));

      value.forEach((value) => {
        const keys = Object.keys(value);
        const index = targetKeys.findIndex(
          (targetKeys) =>
            targetKeys.length === keys.length &&
            !targetKeys.some((t) => keys.includes(t))
        );
        if (index > -1) {
          targetValue.splice(index, 1, value);
        } else {
          targetValue.push(value);
        }
      });
    } else {
      meta[key] = value;
    }
  });

  return meta;
}
