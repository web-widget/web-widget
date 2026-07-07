import type {
  LinkDescriptor,
  MetaDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from '@web-widget/helpers';
import { logPluginWarn } from '@/internal/log';

export interface DevHeadTags {
  script: ScriptDescriptor[];
  style: StyleDescriptor[];
  link: LinkDescriptor[];
  meta: MetaDescriptor[];
}

interface TagToken {
  name: string;
  attrs: string;
  content: string;
}

const SUPPORTED_TAGS = new Set(['script', 'style', 'link', 'meta']);

/**
 * Parse `<head>` HTML into structured tag descriptors using a
 * single-pass token-based parser. Used to extract tags injected by
 * Vite plugins via `transformIndexHtml` so they can be merged into
 * `Meta` without buffering the SSR response.
 *
 * Unsupported tags trigger a console warning.
 */
export function parseHeadTags(html: string): DevHeadTags {
  const headMatch = /<head>([\s\S]*?)<\/head>/i.exec(html);
  const headHtml = headMatch ? headMatch[1] : '';

  const result: DevHeadTags = { script: [], style: [], link: [], meta: [] };

  for (const tag of tokenize(headHtml)) {
    if (!SUPPORTED_TAGS.has(tag.name)) {
      logPluginWarn(
        `Unsupported <head> tag <${tag.name}> was injected by a Vite plugin via transformIndexHtml. ` +
          `It will not appear in the SSR output. Supported tags: <script>, <style>, <link>, <meta>.`
      );
      continue;
    }

    const attrs = parseAttrs(tag.attrs);

    switch (tag.name) {
      case 'script':
        if (attrs.src) {
          result.script.push({ type: attrs.type, src: attrs.src });
        } else if (tag.content.trim()) {
          result.script.push({
            type: attrs.type,
            content: tag.content.trim(),
          });
        }
        break;
      case 'style': {
        const body = tag.content.trim();
        if (body) result.style.push({ content: body });
        break;
      }
      case 'link':
        if (Object.keys(attrs).length) {
          result.link.push(attrs as LinkDescriptor);
        }
        break;
      case 'meta':
        if (Object.keys(attrs).length) {
          result.meta.push(attrs as MetaDescriptor);
        }
        break;
    }
  }

  return result;
}

/**
 * Tokenize HTML into a sequence of opening tags with their inner
 * content. Closing tags, comments, and doctype declarations are
 * skipped. Self-closing tags produce tokens with empty content.
 */
function* tokenize(html: string): Generator<TagToken> {
  let pos = 0;

  while (pos < html.length) {
    const lt = html.indexOf('<', pos);
    if (lt === -1) break;

    const gt = html.indexOf('>', lt);
    if (gt === -1) break;

    let raw = html.slice(lt + 1, gt).trim();

    // Skip comments, doctype, processing instructions
    if (raw.startsWith('!') || raw.startsWith('?')) {
      pos = gt + 1;
      continue;
    }

    // Skip closing tags
    if (raw.startsWith('/')) {
      pos = gt + 1;
      continue;
    }

    // Handle self-closing syntax
    const selfClosing = raw.endsWith('/');
    if (selfClosing) raw = raw.slice(0, -1).trim();

    const nameMatch = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(raw);
    if (!nameMatch) {
      pos = gt + 1;
      continue;
    }

    const name = nameMatch[1].toLowerCase();
    const attrs = raw.slice(nameMatch[1].length);

    let content = '';
    if (!selfClosing) {
      const closeTag = `</${name}`;
      const closeIdx = html.toLowerCase().indexOf(closeTag, gt + 1);
      if (closeIdx !== -1) {
        content = html.slice(gt + 1, closeIdx);
        const closeGt = html.indexOf('>', closeIdx);
        pos = closeGt !== -1 ? closeGt + 1 : closeIdx + closeTag.length;
      } else {
        pos = gt + 1;
      }
    } else {
      pos = gt + 1;
    }

    yield { name, attrs, content };
  }
}

/** Parse a tag's attribute string into a key-value record. */
function parseAttrs(attrsStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of attrsStr.matchAll(/([a-zA-Z-]+)\s*=\s*["']([^"']*)["']/g)) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}
