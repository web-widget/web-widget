const HASHED_ASSET = /\/assets\/[^"'\s]+?-[A-Za-z0-9_-]+\.(?:js|css)/g;

/** Built @widget modules keep a content hash after the module suffix. */
const WIDGET_IMPORT_ASSET =
  /\/assets\/([^"'\s]+@widget)-[A-Za-z0-9_-]+\.(js|css)/g;

const CSS_MODULE_CLASS = /_([a-zA-Z0-9-]+)_[a-z0-9]+/g;

const VUE_SCOPED_ATTR = / data-v-[a-f0-9]+/g;

function hiddenBlockSortKey(block: string): string {
  const username = block.match(/username&quot;:&quot;([^&]+)&quot;/);
  const widget = block.match(/name="([^"]+)"/);
  if (username && widget) {
    return `${widget[1]}:${username[1]}`;
  }

  if (username) {
    return `user:${username[1]}`;
  }

  const demo = block.match(/id&quot;:&quot;([^&]+)&quot;/);
  if (demo) {
    return `demo:${demo[1]}`;
  }

  const testId = block.match(/data-testid="([^"]+)"/);
  if (testId) {
    return `test:${testId[1]}`;
  }

  if (widget) {
    return `widget:${widget[1]}`;
  }

  const slot = block.match(/id="S:(\d+)"/);
  return `slot:${slot?.[1] ?? block}`;
}

function extractBalancedDiv(html: string, startIndex: number): string {
  let depth = 0;

  for (let index = startIndex; index < html.length; index++) {
    if (html.startsWith('<div', index)) {
      depth++;
      continue;
    }

    if (html.startsWith('</div>', index)) {
      depth--;
      if (depth === 0) {
        return html.slice(startIndex, index + '</div>'.length);
      }
    }
  }

  throw new Error('Unbalanced hidden streaming block');
}

function flattenHiddenStreamingBlocks(html: string): string {
  let body = html.replace(/<script>\$RC\([^<]*\)<\/script>/g, '');
  const blocks: string[] = [];
  const openPattern = /<div hidden id="S:\d+">/;

  let openMatch = body.match(openPattern);
  while (openMatch && openMatch.index !== undefined) {
    const block = extractBalancedDiv(body, openMatch.index);
    blocks.push(block);
    body =
      body.slice(0, openMatch.index) +
      body.slice(openMatch.index + block.length);
    openMatch = body.match(openPattern);
  }

  blocks.sort((left, right) =>
    hiddenBlockSortKey(left).localeCompare(hiddenBlockSortKey(right))
  );

  return body.replace(/(<footer>[\s\S]*?<\/footer>)/, `$1${blocks.join('')}`);
}

export function normalizeProductionHeaders(
  headers: Headers
): Record<string, string> {
  const entries = Object.fromEntries(headers.entries());

  for (const key of [
    'connection',
    'date',
    'keep-alive',
    'transfer-encoding',
    'x-accel-buffering',
  ]) {
    delete entries[key];
  }

  return entries;
}

export function normalizeProductionBody(html: string): string {
  let body = html;

  body = body.replace(
    /<aside><!--\$?\?--><template id="B:\d+"><\/template><!--\/\$--><\/aside>[\s\S]*?<div hidden id="S:\d+">([\s\S]*?)<\/div>/,
    '<aside><!--$-->$1<!--/$--></aside>'
  );
  body = body.replace(/<script>requestAnimationFrame[\s\S]*?<\/script>/g, '');
  body = body.replace(/<script>\$RB=\[\][\s\S]*?<\/script>/g, '');
  body = body.replace(/<script>\$RC\([^<]*\)<\/script>/g, '');
  body = flattenHiddenStreamingBlocks(body);

  body = body.replace(
    /<script type="importmap">[\s\S]*?<\/script>/,
    '<script type="importmap">{}</script>'
  );
  body = body.replace(
    /<script >\(\(o,r,n,s,e,p="loader"\)[\s\S]*?<\/script>/,
    '<script>IMPORT_SHIM</script>'
  );
  body = body.replace(
    /<script type="module">const m=\[[^\]]*\];[\s\S]*?<\/script>/,
    '<script type="module" src="/assets/entry.client.js"></script>'
  );
  body = body.replace(
    /<link rel="modulepreload" href="\/assets\/[^"]+" \/>/g,
    '<link rel="modulepreload" href="/assets/entry.client.js" />'
  );
  body = body.replace(
    /<link href="\/assets\/[^"]+\.css" rel="stylesheet" \/>/g,
    '<link href="/assets/styles.css" rel="stylesheet" />'
  );
  body = body.replace(
    /(<link href="\/assets\/styles.css" rel="stylesheet" \/>)+/g,
    '<link href="/assets/styles.css" rel="stylesheet" />'
  );

  // Normalize inlined CSS (<style> tags) to a stable placeholder so snapshot
  // tests don't break when CSS merging/inlining changes content.
  body = body.replace(
    /<style>(?!web-widget\{display:contents\})[\s\S]*?<\/style>/g,
    '<style>INLINED_CSS</style>'
  );

  body = body.replace(HASHED_ASSET, (assetPath) => {
    const extension = assetPath.endsWith('.css') ? '.css' : '.js';
    const basename = assetPath
      .slice('/assets/'.length)
      .replace(/-[A-Za-z0-9_-]+\.(js|css)$/, extension);
    return `/assets/${basename}`;
  });
  body = body.replace(
    WIDGET_IMPORT_ASSET,
    (_match, basename, extension) => `/assets/${basename}.${extension}`
  );
  body = body.replace(CSS_MODULE_CLASS, '_$1_HASH');
  body = body.replace(VUE_SCOPED_ATTR, ' data-v-HASH');

  return body;
}
