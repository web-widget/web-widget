import type { Meta } from '@web-widget/schema';
import { escapeHtml } from './utils';

const safeAttributeName = (value: string) =>
  escapeHtml(String(value)).toLowerCase();
const safeAttributeValue = (value: string) => escapeHtml(String(value));

const createAttributes = (attrs: Record<string, string | undefined>) =>
  Object.entries(attrs)
    .map(([attrName, attrValue]) =>
      typeof attrValue === 'string'
        ? `${safeAttributeName(attrName)}${
            attrValue === '' ? '' : '="' + safeAttributeValue(attrValue) + '"'
          }`
        : ''
    )
    .join(' ');

function createElement(
  name: string,
  attributes: Record<string, string | undefined>,
  children?: string
): string {
  return typeof children === 'string'
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
  const systemTags: string[] = [];
  const basicTags: string[] = [];
  const metaTags: string[] = [];
  const importmapTags: string[] = [];
  const linkTags: string[] = [];
  const styleTags: string[] = [];
  const scriptTags: string[] = [];

  for (const [name, content] of Object.entries(meta)) {
    switch (name) {
      case 'title': {
        basicTags.push(createElement(name, {}, createText(content)));
        break;
      }
      case 'description': {
        basicTags.push(createElement('meta', { name, content }));
        break;
      }
      case 'keywords': {
        basicTags.push(createElement('meta', { name, content }));
        break;
      }
      case 'base': {
        // NOTE: this element must come before other elements with attribute values of URLs,
        // such as <link>'s href attribute.
        basicTags.push(createElement(name, content as Record<string, string>));
        break;
      }
      case 'meta': {
        for (const attributes of content as Record<string, string>[]) {
          if (attributes.name === 'viewport' || attributes.charset) {
            systemTags.push(createElement(name, attributes));
          } else {
            metaTags.push(createElement(name, attributes));
          }
        }
        break;
      }
      case 'link': {
        for (const attributes of content as Record<string, string>[]) {
          linkTags.push(createElement(name, attributes));
        }
        break;
      }
      case 'style': {
        for (const { content: text = '', ...attributes } of content as Record<
          string,
          string
        >[]) {
          styleTags.push(createElement(name, attributes, createRawText(text)));
        }
        break;
      }
      case 'script': {
        for (const { content: text = '', ...attributes } of content as Record<
          string,
          string
        >[]) {
          const script = createElement(name, attributes, createRawText(text));
          if (attributes?.type === 'importmap') {
            // NOTE: ImportMap must precede link[rel=modulepreload] elements
            importmapTags.push(script);
          } else {
            scriptTags.push(script);
          }
        }
        break;
      }
      case 'lang': {
        break;
      }
      default: {
        throw new Error(`Unknown meta type: ${name}`);
      }
    }
  }

  return (
    systemTags.join('') +
    basicTags.join('') +
    metaTags.join('') +
    importmapTags.join('') +
    linkTags.join('') +
    styleTags.join('') +
    scriptTags.join('')
  );
}

export function rebaseMeta(meta: Meta, importer: string): Meta {
  const RESOLVE_URL_REG = /^(?:\w+:)?\//;
  const rebase = (url: string) => {
    if (RESOLVE_URL_REG.test(url)) {
      return url;
    } else if (importer.startsWith('/')) {
      const placeholder = 'placeholder:';
      return new URL(url, placeholder + importer).href.replace(placeholder, '');
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
          key === 'meta'
            ? target.findIndex(
                (meta) =>
                  ('name' in meta &&
                    'name' in override &&
                    meta.name === override.name) ||
                  ('property' in meta &&
                    'property' in override &&
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
