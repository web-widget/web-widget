import type {
  LinkDescriptor,
  Meta,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from "../types";
import { escapeHtml } from "./utils";

const safeAttributeName = (value: string) =>
  escapeHtml(String(value)).toLowerCase();
const safeAttributeValue = (value: string) => escapeHtml(String(value));

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
  return escapeHtml(data);
}

function createRawText(data: string) {
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
            createElement(key, props, createRawText(content))
          );
        }
      );
    }

    if (key === "style") {
      return (value as StyleDescriptor[]).forEach(
        ({ content = "", ...props }) =>
          priority[2].push(createElement(key, props, createRawText(content)))
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

export const mergeMeta = (defaults: Meta, overrides: Meta): Meta => {
  const mergedMeta = Object.entries(defaults).reduce(
    (meta, [key, value]) => {
      meta[key] = Array.isArray(value)
        ? [...value.map((item) => ({ ...item }))]
        : value;
      return meta;
    },
    {} as Record<string, string | Record<string, string>[]>
  );

  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      const target = (mergedMeta[key] ??= []) as Record<string, string>[];
      for (const override of value) {
        const index =
          key === "meta"
            ? target.findIndex(
                (meta) =>
                  ("name" in meta &&
                    "name" in override &&
                    meta.name === override.name) ||
                  ("property" in meta &&
                    "property" in override &&
                    meta.property === override.property)
                // ("key" in meta && "key" in override)
              )
            : -1;
        if (index > -1) {
          target.splice(index, 1, override);
        } else {
          target.push(override);
        }
      }
    } else {
      mergedMeta[key] = value;
    }
  }

  return mergedMeta;
};
