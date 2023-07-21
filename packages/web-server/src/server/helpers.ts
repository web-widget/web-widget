import {
  Meta,
  DocumentMeta,
  DocumentLink,
  DocumentStyle,
  DocumentScript,
} from "./types";

type EscapeLookupKey = "&" | ">" | "<" | "\u2028" | "\u2029";
const ESCAPE_LOOKUP = {
  "&": "\\u0026",
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

type TerminatorsLookupKey = "\u2028" | "\u2029";
const TERMINATORS_LOOKUP = {
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const TERMINATORS_REGEX = /[\u2028\u2029]/g;

function escaper(match: EscapeLookupKey) {
  return ESCAPE_LOOKUP[match];
}

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
/**
 * Properly escape JSON for usage as an object literal inside of a `<script>` tag.
 * JS implementation of http://golang.org/pkg/encoding/json/#HTMLEscape
 * More info: http://timelessrepo.com/json-isnt-a-javascript-subset
 * https://github.com/zertosh/htmlescape/blob/master/htmlescape.js
 */
function safeJSON(obj: any): string {
  return JSON.stringify(obj).replace(ESCAPE_REGEX, escaper as () => string);
}

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
  Array.from(Object.entries(meta)).forEach(([tagName, value]) => {
    if (tagName === "title") {
      return priority[0].push(createElement("title", {}, createText(value)));
    }

    if (tagName === "description" || tagName === "keywords") {
      return priority[0].push(createElement(tagName, { content: value }));
    }

    if (tagName === "meta") {
      return (value as DocumentMeta[]).forEach((props) =>
        priority[0].push(createElement("meta", props as Record<string, string>))
      );
    }

    if (tagName === "link") {
      return (value as DocumentLink[]).forEach((props) =>
        priority[2].push(createElement("link", props as Record<string, string>))
      );
    }

    if (tagName === "style") {
      return (value as DocumentStyle[]).forEach(({ style = "", ...props }) =>
        priority[2].push(createElement("style", props, createText(style)))
      );
    }

    if (tagName === "script") {
      return (value as DocumentScript[]).forEach(
        ({ script = "", ...props }) => {
          const text =
            typeof script === "string" ? createText(script) : safeJSON(script);
          priority[props?.type === "importmap" ? 1 : 2].push(
            createElement("script", props, text)
          );
        }
      );
    }
  });

  return priority.flat().join("");
}
