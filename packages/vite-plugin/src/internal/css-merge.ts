import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { transform, type Url } from 'lightningcss';
import type { LinkDescriptor } from '@web-widget/helpers';

/** CSS processing configuration. */
export interface CssConfig {
  inlineStrategy: 'auto' | 'always' | 'never';
  inlineThreshold: number;
}

export interface ProcessCssOptions {
  linkMap: Record<string, LinkDescriptor[]>;
  base: string;
  /** Absolute path to the client output directory (e.g. `dist/client`). */
  clientOutDir: string;
  /** Assets sub-directory within `clientOutDir` (e.g. `assets`). */
  assetsDir: string;
  cssConfig: CssConfig;
}

export interface ProcessCssResult {
  linkMap: Record<string, LinkDescriptor[]>;
  styleMap: Record<string, string>;
}

const ABSOLUTE_URL_REG = /^(?:[a-z][a-z0-9+.-]*:|data:|\/|#)/i;

/**
 * Rebase relative `url()` references in CSS content to absolute (root-relative)
 * URLs, so the CSS remains valid after being inlined into `<style>` or merged
 * into a single file at a different path.
 *
 * `cssFileUrl` is the original URL of the CSS file as served by the browser
 * (e.g. `/assets/foo-hash.css`). Relative `url()` values are resolved against
 * the directory portion of this URL.
 */
function rebaseCssUrls(content: string, cssFileUrl: string): string {
  const dir = cssFileUrl.slice(0, cssFileUrl.lastIndexOf('/') + 1);

  try {
    const result = transform({
      filename: cssFileUrl,
      code: new TextEncoder().encode(content),
      errorRecovery: true,
      minify: true,
      visitor: {
        Url(url: Url): Url | void {
          const urlStr = url.url;
          if (ABSOLUTE_URL_REG.test(urlStr)) {
            return url;
          }
          // Resolve relative URL against the CSS file's directory.
          // Use a dummy base to leverage the URL constructor for proper
          // resolution (handles `./`, `../`, etc.).
          try {
            const resolved = new URL(urlStr, 'http://dummy.local' + dir);
            // Strip the dummy origin, keep the path (+ query/hash).
            const rebased = resolved.pathname + resolved.search + resolved.hash;
            return { loc: url.loc, url: rebased };
          } catch {
            return { loc: url.loc, url: dir + urlStr };
          }
        },
      },
    });
    return result.code.toString();
  } catch {
    // If lightningcss fails to parse, return the original content unchanged.
    return content;
  }
}

/**
 * Generate a short content hash for a CSS file name.
 */
function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/**
 * Resolve a link `href` to an absolute file path on disk.
 * Returns `null` if the href doesn't originate from the client build output
 * (e.g. external URLs).
 */
function hrefToFilePath(
  href: string,
  base: string,
  clientOutDir: string
): string | null {
  if (!href.startsWith(base)) {
    return null;
  }
  const relativeFile = href.slice(base.length);
  return path.join(clientOutDir, relativeFile);
}

/**
 * Process CSS links for every entry in `linkMap`:
 *
 * - Separates CSS (`rel: stylesheet`) links from non-CSS links.
 * - Reads CSS file contents from the client output directory.
 * - Rebases `url()` references to absolute paths via `lightningcss`.
 * - Per entry, makes a binary decision based on `inlineStrategy` / `inlineThreshold`:
 *   - Inline: concatenated CSS goes into `styleMap[entryId]`, CSS links removed from `linkMap`.
 *   - Merge: concatenated CSS is emitted as a new file, CSS links replaced by a single link.
 *
 * Non-CSS links (modulepreload, preload, etc.) are always preserved in `linkMap`.
 */
export async function processCssLinks(
  options: ProcessCssOptions
): Promise<ProcessCssResult> {
  const { linkMap, base, clientOutDir, assetsDir, cssConfig } = options;
  const { inlineStrategy, inlineThreshold } = cssConfig;

  const newLinkMap: Record<string, LinkDescriptor[]> = {};
  const styleMap: Record<string, string> = {};

  for (const [entryId, links] of Object.entries(linkMap)) {
    const cssLinks: LinkDescriptor[] = [];
    const nonCssLinks: LinkDescriptor[] = [];

    for (const link of links) {
      if (link.rel === 'stylesheet') {
        cssLinks.push(link);
      } else {
        nonCssLinks.push(link);
      }
    }

    // No CSS to process — keep links as-is.
    if (cssLinks.length === 0) {
      newLinkMap[entryId] = links;
      continue;
    }

    // Read and rebase CSS contents.
    const contents: string[] = [];
    let totalSize = 0;
    for (const cssLink of cssLinks) {
      const href = cssLink.href;
      if (!href) {
        continue;
      }
      const filePath = hrefToFilePath(href, base, clientOutDir);
      if (!filePath) {
        // External CSS — keep the original link, don't inline/merge.
        nonCssLinks.push(cssLink);
        continue;
      }
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        // File not found — keep the original link.
        nonCssLinks.push(cssLink);
        continue;
      }
      // Skip empty files.
      if (content.length === 0) {
        continue;
      }
      // Track original size for threshold decision (before rebase transform).
      totalSize += content.length;
      contents.push(rebaseCssUrls(content, href));
    }

    // All CSS was empty or external — keep non-CSS links only.
    if (contents.length === 0) {
      newLinkMap[entryId] = nonCssLinks;
      continue;
    }

    const shouldInline =
      inlineStrategy === 'always' ||
      (inlineStrategy === 'auto' && totalSize <= inlineThreshold);

    if (shouldInline) {
      // Inline: put concatenated CSS into styleMap, CSS links removed from linkMap.
      styleMap[entryId] = contents.join('\n');
      newLinkMap[entryId] = nonCssLinks;
    } else {
      // Merge: if there's only one CSS file, keep the original link (no benefit from merging).
      if (cssLinks.length === 1 && contents.length === 1) {
        newLinkMap[entryId] = [...nonCssLinks, ...cssLinks];
        continue;
      }

      // Emit merged CSS file.
      const mergedContent = contents.join('\n');
      const hash = generateHash(mergedContent);
      const fileName = `${assetsDir}/css-${hash}.css`;
      const filePath = path.join(clientOutDir, fileName);
      await fs.writeFile(filePath, mergedContent, 'utf-8');

      const mergedLink: LinkDescriptor = {
        rel: 'stylesheet',
        href: base + fileName,
      };
      newLinkMap[entryId] = [...nonCssLinks, mergedLink];
    }
  }

  return { linkMap: newLinkMap, styleMap };
}
