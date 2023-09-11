import type {
  LinkDescriptor,
  Meta,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from "../types";

type Imports = Record<string, string>;
type Scopes = Record<string, Imports>;
type ImportMap = {
  imports?: Imports;
  scopes?: Scopes;
};

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
          // NOTE: ImportMap must precede link[rel=modulepreload] elements
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

export function rebaseMeta(meta: Meta, importer: string): Meta {
  const RESOLVE_URL_REG = /^(?:\w+:)?\//;
  const rebase = (url: string) => {
    if (RESOLVE_URL_REG.test(url)) {
      return url;
    } else if (importer.startsWith("/")) {
      const placeholder = "placeholder:";
      return new URL(url, placeholder + importer).href.replace(placeholder, "");
    } else {
      return new URL(url, importer).href;
    }
  };

  return {
    ...meta,

    link: (meta.link ?? []).map((props) => {
      if (props.href) {
        return {
          ...props,
          href: rebase(props.href),
        };
      }
      return { ...props };
    }),

    script: (meta.script ?? []).map((props) => {
      if (props.src) {
        return {
          ...props,
          src: rebase(props.src),
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
    (mergedMeta, [overrideKey, overrideValue]) => {
      if (Array.isArray(overrideValue)) {
        mergedMeta[overrideKey] = mergedMeta[overrideKey] ?? [];
        const mergedDescriptors = mergedMeta[overrideKey] as Record<
          string,
          string
        >[];

        overrideValue.forEach((overrideDescriptor) => {
          let replaceIndex = -1;
          if (overrideKey === "meta") {
            replaceIndex = mergedDescriptors.findIndex(
              ({ name }) => name === overrideDescriptor.name
            );
          } else if (
            overrideKey === "script" &&
            overrideDescriptor.type === "importmap" &&
            typeof overrideDescriptor.content === "string"
          ) {
            replaceIndex = mergedDescriptors.findIndex(
              ({ type }) => type === overrideDescriptor.type
            );
            const mergedDescriptor = mergedDescriptors[replaceIndex];

            if (
              mergedDescriptor &&
              typeof mergedDescriptor.content === "string"
            ) {
              const mergedImportMap = JSON.parse(
                mergedDescriptor.content
              ) as ImportMap;
              const overrideImportMap = JSON.parse(
                overrideDescriptor.content
              ) as ImportMap;

              overrideDescriptor = {
                ...overrideDescriptor,
                content: JSON.stringify({
                  imports: {
                    ...mergedImportMap.imports,
                    ...overrideImportMap.imports,
                  },
                  scopes: {
                    ...mergedImportMap.scopes,
                    ...overrideImportMap.scopes,
                  },
                } as ImportMap),
              };
            }
          }

          if (replaceIndex > -1) {
            mergedDescriptors.splice(replaceIndex, 1, overrideDescriptor);
          } else {
            mergedDescriptors.push(overrideDescriptor);
          }
        });
      } else {
        mergedMeta[overrideKey] = overrideValue;
      }
      return mergedMeta;
    },
    newDefaults
  );

  return newOverrides;
}
