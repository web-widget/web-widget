/**
 * Vite plugin for compressing `html` tagged template literals.
 *
 * Removes redundant whitespace from the static parts of `html` tagged
 * templates at build time, reducing the number of bytes sent over the wire.
 *
 * No third-party HTML minifier is needed because:
 * 1. Template literals split HTML across `${...}` interpolations — full HTML
 *    parsers cannot handle fragments.
 * 2. The main win is whitespace collapse, which is straightforward to implement.
 * 3. Zero external dependencies (only `magic-string`, already in the monorepo).
 */

import MagicString from 'magic-string';
import type { Plugin } from 'vite';

export interface HtmlCompressOptions {
  /**
   * Tag function names to process. Defaults to `['html']`.
   * Add custom names if you import `html` with a different alias.
   */
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Scanner — finds `html` tagged template literals in source code
// ---------------------------------------------------------------------------

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;

interface StaticPart {
  /** Start offset of the static text in source (after `` ` `` or `}`). */
  start: number;
  /** End offset of the static text in source (before `${` or `` ` ``). */
  end: number;
  /** Raw text content. */
  text: string;
}

/** Code region inside a `${...}` interpolation. */
interface InterpolationRegion {
  /** Start offset (after `{`). */
  start: number;
  /** End offset (before `}`). */
  end: number;
}

interface TaggedTemplateInfo {
  /** Position of the opening backtick. */
  templateStart: number;
  /** Position after the closing backtick. */
  end: number;
  /** Static text parts between interpolations. */
  statics: StaticPart[];
  /** Interpolation code regions (for nested template scanning). */
  interpolations: InterpolationRegion[];
}

/** Skip a `'...'` or `"..."` string starting at the quote position. */
function skipString(code: string, quotePos: number): number {
  const quote = code[quotePos];
  let i = quotePos + 1;
  const len = code.length;
  while (i < len) {
    if (code[i] === '\\') {
      i += 2;
      continue;
    }
    if (code[i] === quote) return i + 1;
    i++;
  }
  return i;
}

/**
 * Skip a template literal starting at `backtickPos` (the opening backtick).
 * Returns the position after the closing backtick.
 */
function skipTemplateLiteral(code: string, backtickPos: number): number {
  let i = backtickPos + 1;
  const len = code.length;
  while (i < len) {
    const ch = code[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') return i + 1;
    if (ch === '$' && code[i + 1] === '{') {
      i += 2;
      let depth = 1;
      while (i < len && depth > 0) {
        const c = code[i];
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === '{') {
          depth++;
          i++;
          continue;
        }
        if (c === '}') {
          depth--;
          i++;
          continue;
        }
        if (c === '`') {
          i = skipTemplateLiteral(code, i);
          continue;
        }
        if (c === "'" || c === '"') {
          i = skipString(code, i);
          continue;
        }
        i++;
      }
      continue;
    }
    i++;
  }
  return i;
}

/**
 * Parse a tagged template literal starting at the opening backtick.
 * Returns info about static parts and interpolation regions, or null if unterminated.
 */
function parseTaggedTemplate(
  code: string,
  backtickPos: number
): TaggedTemplateInfo | null {
  const statics: StaticPart[] = [];
  const interpolations: InterpolationRegion[] = [];
  let i = backtickPos + 1;
  let staticStart = i;
  const len = code.length;

  while (i < len) {
    const ch = code[i];

    if (ch === '\\') {
      i += 2;
      continue;
    }

    if (ch === '`') {
      statics.push({
        start: staticStart,
        end: i,
        text: code.slice(staticStart, i),
      });
      return {
        templateStart: backtickPos,
        end: i + 1,
        statics,
        interpolations,
      };
    }

    if (ch === '$' && code[i + 1] === '{') {
      statics.push({
        start: staticStart,
        end: i,
        text: code.slice(staticStart, i),
      });
      const interpStart = i + 2;
      i += 2;
      let depth = 1;
      while (i < len && depth > 0) {
        const c = code[i];
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === '{') {
          depth++;
          i++;
          continue;
        }
        if (c === '}') {
          depth--;
          i++;
          continue;
        }
        if (c === '`') {
          i = skipTemplateLiteral(code, i);
          continue;
        }
        if (c === "'" || c === '"') {
          i = skipString(code, i);
          continue;
        }
        if (c === '/' && code[i + 1] === '/') {
          i += 2;
          while (i < len && code[i] !== '\n') i++;
          continue;
        }
        if (c === '/' && code[i + 1] === '*') {
          i += 2;
          while (i < len && !(code[i] === '*' && code[i + 1] === '/')) i++;
          i += 2;
          continue;
        }
        i++;
      }
      interpolations.push({ start: interpStart, end: i - 1 });
      staticStart = i;
      continue;
    }

    i++;
  }

  return null;
}

/**
 * Scan a region of source code for tagged template literals.
 * Recursively scans inside interpolations to find nested templates.
 */
function scanRegion(
  code: string,
  start: number,
  end: number,
  tagNames: Set<string>,
  results: TaggedTemplateInfo[]
): void {
  let i = start;

  while (i < end) {
    const ch = code[i];

    // Skip line comments
    if (ch === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < end && code[i] !== '\n') i++;
      continue;
    }

    // Skip block comments
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < end && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // Skip string literals
    if (ch === "'" || ch === '"') {
      i = skipString(code, i);
      continue;
    }

    // Skip untagged template literals
    if (ch === '`') {
      i = skipTemplateLiteral(code, i);
      continue;
    }

    // Check for identifier
    if (IDENT_START.test(ch)) {
      const identStart = i;
      i++;
      while (i < end && IDENT_PART.test(code[i])) i++;
      const ident = code.slice(identStart, i);

      // Skip property access (e.g. obj.html`...`)
      if (identStart > 0 && code[identStart - 1] === '.') {
        continue;
      }

      if (tagNames.has(ident)) {
        // Skip whitespace between identifier and backtick
        let j = i;
        while (
          j < end &&
          (code[j] === ' ' ||
            code[j] === '\t' ||
            code[j] === '\n' ||
            code[j] === '\r')
        )
          j++;

        if (code[j] === '`') {
          const info = parseTaggedTemplate(code, j);
          if (info) {
            results.push(info);
            // Recursively scan interpolations for nested templates
            for (const interp of info.interpolations) {
              scanRegion(code, interp.start, interp.end, tagNames, results);
            }
            i = info.end;
            continue;
          }
        }
      }
      continue;
    }

    i++;
  }
}

/**
 * Find all tagged template literals whose tag is in `tagNames`,
 * including those nested inside interpolations.
 */
function findTaggedTemplates(
  code: string,
  tagNames: Set<string>
): TaggedTemplateInfo[] {
  const results: TaggedTemplateInfo[] = [];
  scanRegion(code, 0, code.length, tagNames, results);
  return results;
}

// ---------------------------------------------------------------------------
// HTML Compressor — whitespace minifier for static template parts
// ---------------------------------------------------------------------------

/** Tags whose content is whitespace-sensitive. */
const SENSITIVE_OPEN_RE = /<(pre|textarea|script|style)\b/i;

/** Collapse whitespace and remove spaces between HTML tags. */
function compressWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/>\s+</g, '><');
}

/**
 * Compress an array of static template parts.
 *
 * - Collapses consecutive whitespace into a single space.
 * - Removes whitespace between `>` and `<` (between HTML tags).
 * - Preserves content inside `<pre>`, `<textarea>`, `<script>`, `<style>`.
 * - Trims leading whitespace on the first part, trailing on the last part.
 */
function compressStaticParts(parts: string[]): string[] {
  let inSensitive: string | null = null;

  return parts.map((part, idx) => {
    let result = '';
    let remaining = part;

    while (remaining.length > 0) {
      if (inSensitive) {
        // Look for closing sensitive tag
        const closeRe = new RegExp('</' + inSensitive + '\\s*>', 'i');
        const m = closeRe.exec(remaining);
        if (m) {
          result += remaining.slice(0, m.index + m[0].length);
          remaining = remaining.slice(m.index + m[0].length);
          inSensitive = null;
          // Remove leading whitespace between closing tag and next `<`
          remaining = remaining.replace(/^\s+(?=<)/, '');
        } else {
          // Entire remaining text is inside sensitive element
          result += remaining;
          remaining = '';
        }
      } else {
        const m = SENSITIVE_OPEN_RE.exec(remaining);
        if (m) {
          // Compress text before the sensitive tag.
          // Remove trailing whitespace between a tag `>` and the sensitive `<`
          let beforeTag = compressWhitespace(remaining.slice(0, m.index));
          beforeTag = beforeTag.replace(/(>)\s+$/, '$1');
          result += beforeTag;

          const tag = m[1].toLowerCase();
          const afterTag = remaining.slice(m.index);

          // Check if closing tag exists within the same part
          const closeRe = new RegExp('</' + tag + '\\s*>', 'i');
          const cm = closeRe.exec(afterTag);
          if (cm) {
            result += afterTag.slice(0, cm.index + cm[0].length);
            remaining = afterTag.slice(cm.index + cm[0].length);
            // Remove leading whitespace between closing tag and next `<`
            remaining = remaining.replace(/^\s+(?=<)/, '');
          } else {
            // Sensitive block spans into subsequent parts
            result += afterTag;
            inSensitive = tag;
            remaining = '';
          }
        } else {
          result += compressWhitespace(remaining);
          remaining = '';
        }
      }
    }

    if (idx === 0) result = result.trimStart();
    if (idx === parts.length - 1) result = result.trimEnd();

    return result;
  });
}

// ---------------------------------------------------------------------------
// Vite Plugin
// ---------------------------------------------------------------------------

const JS_FILE_RE = /\.[cm]?[jt]sx?$/;
const DEFAULT_TAGS = ['html'];

/**
 * Vite plugin that compresses whitespace in `html` tagged template literals.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { htmlCompress } from '@web-widget/html/vite-plugin';
 *
 * export default {
 *   plugins: [htmlCompress()],
 * };
 * ```
 */
export function htmlCompress(options: HtmlCompressOptions = {}): Plugin {
  const tags = new Set(options.tags ?? DEFAULT_TAGS);

  return {
    name: '@web-widget/html:compress',
    enforce: 'pre',

    transform(code, id) {
      if (!JS_FILE_RE.test(id)) return null;

      // Fast path: skip if no tag name appears in the source
      let hasTag = false;
      for (const tag of tags) {
        if (code.includes(tag)) {
          hasTag = true;
          break;
        }
      }
      if (!hasTag) return null;

      const templates = findTaggedTemplates(code, tags);
      if (templates.length === 0) return null;

      const ms = new MagicString(code);
      let changed = false;

      for (const template of templates) {
        const originals = template.statics.map((s) => s.text);
        const compressed = compressStaticParts(originals);

        for (let i = 0; i < template.statics.length; i++) {
          if (originals[i] !== compressed[i]) {
            ms.update(
              template.statics[i].start,
              template.statics[i].end,
              compressed[i]
            );
            changed = true;
          }
        }
      }

      if (!changed) return null;

      return {
        code: ms.toString(),
        map: ms.generateMap({ source: id, hires: true }),
      };
    },
  };
}

// Export internals for testing
export { findTaggedTemplates, compressStaticParts, compressWhitespace };
