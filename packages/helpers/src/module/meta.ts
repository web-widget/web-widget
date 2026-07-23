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

function createRawText(name: keyof typeof RAW_TEXT_CLOSING_TAG, data: string) {
  if (RAW_TEXT_CLOSING_TAG[name].test(data)) {
    throw new TypeError(`Invalid ${name} content: closing tag is not allowed`);
  }
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

  if (title !== undefined) {
    basicTags += createElement('title', {}, createText(title));
  }

  if (description !== undefined) {
    basicTags += createElement('meta', {
      name: 'description',
      content: description,
    });
  }

  if (keywords !== undefined) {
    basicTags += createElement('meta', { name: 'keywords', content: keywords });
  }

  if (meta) {
    for (const attributes of meta as Record<string, string>[]) {
      const name = attributes.name?.toLowerCase();
      if (name === 'viewport' || attributes.charset) {
        systemTags += createElement('meta', attributes);
      } else if (name === 'description') {
        if (description === undefined) {
          basicTags += createElement('meta', attributes);
        }
      } else if (name === 'keywords') {
        if (keywords === undefined) {
          basicTags += createElement('meta', attributes);
        }
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
      styleTags += createElement(
        'style',
        attributes,
        createRawText('style', content)
      );
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
        createRawText('script', content)
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
