import type {
  LinkDescriptor,
  Meta,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from "../types";

const ESCAPE_REG = /["&'<>]/;

// This utility is based on https://github.com/aui/art-template/blob/master/src/compile/runtime.js
function xmlEscape(content: string) {
  const html = String(content);
  const regexResult = ESCAPE_REG.exec(html);
  if (!regexResult) {
    return content;
  }

  let result = "";
  let i, lastIndex, char;
  for (i = regexResult.index, lastIndex = 0; i < html.length; i++) {
    switch (html.charCodeAt(i)) {
      case 34:
        char = "&#34;";
        break;
      case 38:
        char = "&#38;";
        break;
      case 39:
        char = "&#39;";
        break;
      case 60:
        char = "&#60;";
        break;
      case 62:
        char = "&#62;";
        break;
      default:
        continue;
    }

    if (lastIndex !== i) {
      result += html.substring(lastIndex, i);
    }

    lastIndex = i + 1;
    result += char;
  }

  if (lastIndex !== i) {
    return result + html.substring(lastIndex, i);
  } else {
    return result;
  }
}

const safeAttributeName = (value: string) =>
  xmlEscape(String(value)).toLowerCase();
const safeAttributeValue = (value: string) => xmlEscape(String(value));

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
  return xmlEscape(data);
}

function createHtml(data: string) {
  return data;
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
            createElement(key, props, createHtml(content))
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
  const newDefaults = Object.entries(defaults).reduce(
    (meta, [key, value]) => {
      meta[key] = Array.isArray(value) ? [...value] : value;
      return meta;
    },
    {} as Record<string, string | Record<string, string>[]>
  );

  const newOverrides = Object.entries(overrides).reduce(
    (meta, [key, value]) => {
      if (Array.isArray(value)) {
        meta[key] = meta[key] ?? [];
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
      return meta;
    },
    newDefaults
  );

  return newOverrides;
}
