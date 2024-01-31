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

export function renderMetaToString(metadata: Meta): string {
  const {
    title,
    description,
    keywords,
    base,
    meta,
    link,
    style,
    script,
    lang,
    ...unknownTags
  } = metadata;

  for (const tag of Object.keys(unknownTags)) {
    throw new Error(`Unknown tag: ${tag}`);
  }

  let systemTags = '';
  let basicTags = '';
  let baseTags = '';
  let metaTags = '';
  let importmapTags = '';
  let linkTags = '';
  let styleTags = '';
  let scriptTags = '';

  if (title) {
    basicTags += createElement('title', {}, createText(title));
  }

  if (description) {
    basicTags += createElement('meta', {
      name: 'description',
      content: description,
    });
  }

  if (keywords) {
    basicTags += createElement('meta', { name: 'keywords', content: keywords });
  }

  if (meta) {
    for (const attributes of meta as Record<string, string>[]) {
      if (attributes.name === 'viewport' || attributes.charset) {
        systemTags += createElement('meta', attributes);
      } else if (
        attributes.name === 'description' ||
        attributes.name === 'keywords'
      ) {
        basicTags += createElement('meta', attributes);
      } else {
        metaTags += createElement('meta', attributes);
      }
    }
  }

  if (base) {
    baseTags += createElement('base', base as Record<string, string>);
  }

  if (link) {
    for (const attributes of link as Record<string, string>[]) {
      linkTags += createElement('link', attributes);
    }
  }

  if (style) {
    for (const { content = '', ...attributes } of style as Record<
      string,
      string
    >[]) {
      styleTags += createElement('style', attributes, createRawText(content));
    }
  }

  if (script) {
    for (const { content = '', ...attributes } of script as Record<
      string,
      string
    >[]) {
      const script = createElement(
        'script',
        attributes,
        createRawText(content)
      );
      if (attributes?.type === 'importmap') {
        // NOTE: ImportMap must precede link[rel=modulepreload] elements
        importmapTags += script;
      } else {
        scriptTags += script;
      }
    }
  }

  return (
    systemTags +
    basicTags +
    metaTags +
    baseTags +
    importmapTags +
    linkTags +
    styleTags +
    scriptTags
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
