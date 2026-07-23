import type { Meta } from '@web-widget/schema';
import { escapeHtml } from '@web-widget/purify';

const RAW_TEXT_CLOSING_TAG = {
  script: /<\/script(?=[\t\n\f\r />])/i,
  style: /<\/style(?=[\t\n\f\r />])/i,
};

const isInvalidAttributeName = (name: string) => {
  for (const character of name) {
    const codePoint = character.codePointAt(0) as number;
    const planeCodePoint = codePoint & 0xffff;
    if (
      codePoint <= 0x20 ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
      planeCodePoint === 0xfffe ||
      planeCodePoint === 0xffff ||
      `"'<>/=`.includes(character)
    ) {
      return true;
    }
  }
  return false;
};

const safeAttributeName = (value: string) => {
  const name = String(value).toLowerCase();
  if (isInvalidAttributeName(name)) {
    throw new TypeError(`Invalid attribute name: ${value}`);
  }
  return name;
};
const safeAttributeValue = (value: string) => escapeHtml(String(value));

const createAttributes = (attributes: object) => {
  const serialized: string[] = [];
  for (const [attributeName, attributeValue] of Object.entries(attributes)) {
    if (typeof attributeValue !== 'string') {
      continue;
    }
    const name = safeAttributeName(attributeName);
    serialized.push(
      attributeValue === ''
        ? name
        : `${name}="${safeAttributeValue(attributeValue)}"`
    );
  }
  return serialized.join(' ');
};

function createElement(
  name: string,
  attributes: object,
  children?: string
): string {
  const serializedAttributes = createAttributes(attributes);
  const startTag = `<${name}${
    serializedAttributes ? ` ${serializedAttributes}` : ''
  }`;
  return typeof children === 'string'
    ? `${startTag}>${children}</${name}>`
    : `${startTag} />`;
}

function createText(data: string) {
  return escapeHtml(data);
}

function createRawText(name: keyof typeof RAW_TEXT_CLOSING_TAG, data: string) {
  if (RAW_TEXT_CLOSING_TAG[name].test(data)) {
    throw new TypeError(`Invalid ${name} content: closing tag is not allowed`);
  }
  return data;
}

const getScriptTypeEssence = (type?: string) =>
  type?.trim().toLowerCase().split(';', 1)[0];

function createScriptText(data: string, type?: string) {
  const essence = getScriptTypeEssence(type);
  if (
    essence === 'importmap' ||
    essence === 'application/json' ||
    essence?.endsWith('+json')
  ) {
    return data.replace(/</g, '\\u003c');
  }
  return createRawText('script', data);
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

  const systemTags: string[] = [];
  const basicTags: string[] = [];
  const metaTags: string[] = [];
  const baseTags: string[] = [];
  const importmapTags: string[] = [];
  const linkTags: string[] = [];
  const styleTags: string[] = [];
  const scriptTags: string[] = [];

  if (title !== undefined) {
    basicTags.push(createElement('title', {}, createText(title)));
  }

  if (description !== undefined) {
    basicTags.push(
      createElement('meta', {
        name: 'description',
        content: description,
      })
    );
  }

  if (keywords !== undefined) {
    basicTags.push(
      createElement('meta', { name: 'keywords', content: keywords })
    );
  }

  if (meta) {
    for (const attributes of meta) {
      const name = attributes.name?.toLowerCase();
      if (
        (name === 'description' && description !== undefined) ||
        (name === 'keywords' && keywords !== undefined)
      ) {
        continue;
      }
      const element = createElement('meta', attributes);
      if (name === 'viewport' || attributes.charset) {
        systemTags.push(element);
      } else if (name === 'description' || name === 'keywords') {
        basicTags.push(element);
      } else {
        metaTags.push(element);
      }
    }
  }

  if (base) {
    baseTags.push(createElement('base', base));
  }

  if (link) {
    for (const attributes of link) {
      linkTags.push(createElement('link', attributes));
    }
  }

  if (style) {
    for (const { content = '', ...attributes } of style) {
      styleTags.push(
        createElement('style', attributes, createRawText('style', content))
      );
    }
  }

  if (script) {
    for (const { content = '', ...attributes } of script) {
      const element = createElement(
        'script',
        attributes,
        createScriptText(content, attributes.type)
      );
      if (getScriptTypeEssence(attributes.type) === 'importmap') {
        // NOTE: ImportMap must precede link[rel=modulepreload] elements
        importmapTags.push(element);
      } else {
        scriptTags.push(element);
      }
    }
  }

  return [
    ...systemTags,
    ...basicTags,
    ...metaTags,
    ...baseTags,
    ...importmapTags,
    ...linkTags,
    ...styleTags,
    ...scriptTags,
  ].join('');
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

type Descriptor = Record<string, string | undefined>;

const REPEATABLE_OPEN_GRAPH_PROPERTIES = new Set([
  'og:audio',
  'og:image',
  'og:locale:alternate',
  'og:video',
]);

const cloneMetaValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => ({ ...item }));
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value;
};

const isCanonical = (descriptor: Descriptor) =>
  descriptor.rel
    ?.split(/\s+/)
    .some((relation) => relation.toLowerCase() === 'canonical') ?? false;

const isSameMeta = (current: Descriptor, override: Descriptor) => {
  if (override.charset !== undefined) {
    return current.charset !== undefined;
  }
  if (override['http-equiv'] !== undefined) {
    return (
      current['http-equiv']?.toLowerCase() ===
      override['http-equiv'].toLowerCase()
    );
  }
  return (
    (current.name !== undefined && current.name === override.name) ||
    (current.property !== undefined && current.property === override.property)
  );
};

const replaceDescriptors = (
  target: Descriptor[],
  key: string,
  replacement: Descriptor
) => {
  const replacementIsCanonical = key === 'link' && isCanonical(replacement);
  const compacted: Descriptor[] = [];
  let insertionIndex = -1;

  for (const descriptor of target) {
    const matches =
      (key === 'meta' && isSameMeta(descriptor, replacement)) ||
      (replacementIsCanonical && isCanonical(descriptor));
    if (matches) {
      insertionIndex =
        insertionIndex === -1 ? compacted.length : insertionIndex;
    } else {
      compacted.push(descriptor);
    }
  }

  if (insertionIndex === -1) {
    compacted.push(replacement);
  } else {
    compacted.splice(insertionIndex, 0, replacement);
  }
  return compacted;
};

export const mergeMeta = (defaults: Meta, overrides: Meta): Meta => {
  const mergedMeta = Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, cloneMetaValue(value)])
  ) as Meta;
  const result = mergedMeta as Record<string, unknown>;

  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      let target = (result[key] ??= []) as Descriptor[];
      for (const override of value) {
        const clonedOverride = { ...override } as Descriptor;
        const isRepeatable =
          key === 'meta' &&
          clonedOverride.property !== undefined &&
          REPEATABLE_OPEN_GRAPH_PROPERTIES.has(clonedOverride.property);
        if (isRepeatable) {
          target.push(clonedOverride);
        } else {
          target = replaceDescriptors(target, key, clonedOverride);
        }
      }
      result[key] = target;
    } else {
      result[key] = cloneMetaValue(value);
    }
  }

  return mergedMeta;
};
