import { html, unsafeHTML, fallback, suspense, unpack } from './html';
import type { HTML } from './html';
import { renderToStream } from './render';

/**
 * Consumes an HTML async iterable into a single string.
 * Equivalent to `await new HTMLResponse(html`...`).text()` in the original tests.
 */
async function stringify(content: HTML): Promise<string> {
  let result = '';
  for await (const chunk of content) {
    result += chunk;
  }
  return result;
}

const timeout = (n: number) => new Promise((r) => setTimeout(r, n));

describe('html', () => {
  test('exists', () => {
    expect(html).toBeDefined();
    expect(typeof html).toBe('function');
  });

  test('exists II', () => {
    // prettier-ignore
    expect(html`<div></div>`).toBeDefined();
  });

  test('stringify', async () => {
    // prettier-ignore
    const t = html`<div></div>`;
    expect(await stringify(t)).toBe('<div></div>');
  });

  test('escaping', async () => {
    // prettier-ignore
    const t = html`<div>${'<div></div>'}</div>`;
    expect(await stringify(t)).toBe('<div>&lt;div&gt;&lt;/div&gt;</div>');
  });

  test('async functions as values', async () => {
    const fn = async () => {
      await new Promise((r) => setTimeout(r, 10));
      // prettier-ignore
      return html`<div></div>`;
    };
    // prettier-ignore
    const t = html`<div>${fn}</div>`;
    expect(await stringify(t)).toBe('<div><div></div></div>');
  });

  test('promises as values', async () => {
    const p = (async () => {
      await new Promise((r) => setTimeout(r, 10));
      // prettier-ignore
      return html`<div></div>`;
    })();
    // prettier-ignore
    const t = html`<div>${p}</div>`;
    expect(await stringify(t)).toBe('<div><div></div></div>');
  });

  test('async generator functions as values', async () => {
    const gen = async function* () {
      await timeout(10);
      // prettier-ignore
      yield html`<li>1</li>`;
      await timeout(10);
      // prettier-ignore
      yield html`<li>2</li>`;
    };
    // prettier-ignore
    const t = html`<ul>${gen}</ul>`;
    expect(await stringify(t)).toBe('<ul><li>1</li><li>2</li></ul>');
  });

  test('async generators as values', async () => {
    const gen = (async function* () {
      await timeout(10);
      // prettier-ignore
      yield html`<li>1</li>`;
      await timeout(10);
      // prettier-ignore
      yield html`<li>2</li>`;
    })();
    // prettier-ignore
    const t = html`<ul>${gen}</ul>`;
    expect(await stringify(t)).toBe('<ul><li>1</li><li>2</li></ul>');
  });

  test('unsafe html', async () => {
    // prettier-ignore
    const t = html`<div>${unsafeHTML('<div></div>')}</div>`;
    expect(await stringify(t)).toBe('<div><div></div></div>');
  });

  test('multiple interleaved values', async () => {
    // prettier-ignore
    const t = html`<div>${html`<span></span>`}<br>${html`<span></span>`}</div>`;
    expect(await stringify(t)).toBe(
      '<div><span></span><br><span></span></div>'
    );
  });

  test('promises of lists as values', async () => {
    const p = (async () => {
      await new Promise((r) => setTimeout(r, 10));
      // prettier-ignore
      return [html`<li>1</li>`, html`<li>2</li>`];
    })();
    // prettier-ignore
    const t = html`<ul>${p}</ul>`;
    expect(await stringify(t)).toBe('<ul><li>1</li><li>2</li></ul>');
  });

  test('promises of async generators as values', async () => {
    const p = (async () => {
      await new Promise((r) => setTimeout(r, 10));
      return (async function* () {
        await timeout(10);
        // prettier-ignore
        yield html`<li>1</li>`;
        await timeout(10);
        // prettier-ignore
        yield html`<li>2</li>`;
      })();
    })();
    // prettier-ignore
    const t = html`<ul>${p}</ul>`;
    expect(await stringify(t)).toBe('<ul><li>1</li><li>2</li></ul>');
  });

  test('fallback values', async () => {
    const throwFn = () => {
      throw Error();
    };
    // prettier-ignore
    const t = html`<div>${fallback(html`<main>${throwFn}</main>`, html`<span>An error occurred</span>`)}</div>`;
    expect(await stringify(t)).toBe(
      '<div><main><span>An error occurred</span></div>'
    );
  });

  test('fallback functions', async () => {
    const throwFn = () => {
      throw Error('foo');
    };
    // prettier-ignore
    const t = html`<div>${fallback(html`<main>${throwFn}</main>`, (e) => html`<span>An error occurred: ${e.message}</span>`)}</div>`;
    expect(await stringify(t)).toBe(
      '<div><main><span>An error occurred: foo</span></div>'
    );
  });

  test('falsy values render empty', async () => {
    // prettier-ignore
    const t = html`<div>${null}${undefined}${false}${''}</div>`;
    expect(await stringify(t)).toBe('<div></div>');
  });

  test('arrays of html', async () => {
    // prettier-ignore
    const items = ['Foo', 'Bar', 'Baz'].map((x) => html`<li>${x}</li>`);
    // prettier-ignore
    const t = html`<ul>${items}</ul>`;
    expect(await stringify(t)).toBe(
      '<ul><li>Foo</li><li>Bar</li><li>Baz</li></ul>'
    );
  });

  test('nested html', async () => {
    // prettier-ignore
    const inner = html`<a></a>`;
    // prettier-ignore
    const mid = html`<span>${inner}</span>`;
    // prettier-ignore
    const t = html`<div>${mid}</div>`;
    expect(await stringify(t)).toBe('<div><span><a></a></span></div>');
  });

  test('numbers and booleans', async () => {
    // prettier-ignore
    const a = html`<div>${42}</div>`;
    expect(await stringify(a)).toBe('<div>42</div>');
    // prettier-ignore
    const b = html`<div>${true}</div>`;
    expect(await stringify(b)).toBe('<div>true</div>');
  });

  test('escapes all special characters', async () => {
    expect(await stringify(html`<div>${'<a>&"\'</a>'}</div>`)).toBe(
      '<div>&lt;a&gt;&amp;&quot;&#39;&lt;/a&gt;</div>'
    );
  });

  test('escapes ampersand', async () => {
    expect(await stringify(html`<div>${'a & b'}</div>`)).toBe(
      '<div>a &amp; b</div>'
    );
  });

  test('does not escape safe characters', async () => {
    expect(await stringify(html`<div>${'hello world 123'}</div>`)).toBe(
      '<div>hello world 123</div>'
    );
  });

  test('UnsafeHTML toString returns raw value', () => {
    const u = unsafeHTML('<b>raw</b>');
    expect(u.toString()).toBe('<b>raw</b>');
  });

  test('UnsafeHTML toJSON returns raw value', () => {
    const u = unsafeHTML('<b>raw</b>');
    expect(u.toJSON()).toBe('<b>raw</b>');
    expect(JSON.stringify(u)).toBe('"<b>raw</b>"');
  });

  test('UnsafeHTML with empty/falsy value', async () => {
    expect(await stringify(html`<div>${unsafeHTML('')}</div>`)).toBe(
      '<div></div>'
    );
  });

  test('nested fallback boundaries — innermost catches', async () => {
    const throws = () => {
      throw new Error('inner');
    };
    const t = html`<div>
      ${fallback(
        html`<outer
          >${fallback(html`<inner>${throws}</inner>`, html`<i>caught</i>`)}</outer
        >`,
        html`<o>outer-fallback</o>`
      )}
    </div>`;
    // Inner fallback catches; note </inner> after the throw is not yielded
    expect(await stringify(t)).toBe(
      '<div><outer><inner><i>caught</i></outer></div>'
    );
  });

  test('nested fallback — outer catches when inner has none', async () => {
    const throws = async () => {
      throw new Error('propagate');
    };
    const t = html`<div>
      ${fallback(html`<outer>${throws}</outer>`, html`<o>caught</o>`)}
    </div>`;
    // Outer fallback catches; </outer> after the throw is not yielded
    expect(await stringify(t)).toBe('<div><outer><o>caught</o></div>');
  });

  test('fallback catches error from async generator', async () => {
    const gen = async function* () {
      yield html`<p>ok</p>`;
      throw new Error('mid-stream');
    };
    const t = html`<div>${fallback(gen, html`<err />`)}</div>`;
    expect(await stringify(t)).toBe('<div><p>ok</p><err/></div>');
  });

  test('deeply nested html templates', async () => {
    const deep = html`a${html`b${html`c${html`d`}`}`}`;
    expect(await stringify(deep)).toBe('abcd');
  });

  test('unpack yields escaped string chunks', async () => {
    const chunks: string[] = [];
    for await (const c of unpack('<b>')) {
      chunks.push(c);
    }
    expect(chunks.join('')).toBe('&lt;b&gt;');
  });

  test('unpack handles function content', async () => {
    const chunks: string[] = [];
    for await (const c of unpack(() => html`<x />`)) {
      chunks.push(c);
    }
    expect(chunks.join('')).toBe('<x/>');
  });
});

// ---------------------------------------------------------------------------
// Suspense tests
// ---------------------------------------------------------------------------

/** Reads a ReadableStream into a single string. */
async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value as Uint8Array, { stream: true });
  }
  return result;
}

/** Collects chunks from a ReadableStream in order. */
async function readStreamChunks(stream: ReadableStream): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value as Uint8Array, { stream: true }));
  }
  return chunks;
}

describe('suspense (passthrough mode)', () => {
  test('blocks on content when not in renderToStream', async () => {
    const slow = timeout(10).then(() => html`<p>resolved</p>`);
    const t = html`<div>${suspense(slow, html`<p>loading</p>`)}</div>`;
    expect(await stringify(t)).toBe('<div><p>resolved</p></div>');
  });

  test('falls back on error in passthrough mode', async () => {
    const throws = async () => {
      throw new Error('boom');
    };
    const t = html`<div>
      ${fallback(suspense(throws, html`<p>pending</p>`), html`<p>fallback</p>`)}
    </div>`;
    expect(await stringify(t)).toBe('<div><p>fallback</p></div>');
  });
});

describe('suspense (streaming mode via renderToStream)', () => {
  test('outputs fallback immediately, then real content', async () => {
    const slow = timeout(10).then(() => 'real');
    const page = html`<div>${suspense(slow, html`loading`)}</div>`;
    const result = await readStream(renderToStream(page));

    // Phase 1: fallback wrapped in markers
    expect(result).toContain('<!--$H?--><template id="HB:0"></template>');
    expect(result).toContain('loading');
    expect(result).toContain('<!--/$H-->');

    // Phase 2: hidden content + $HRC script
    expect(result).toContain('<div hidden id="HS:0">real</div>');
    expect(result).toContain('$HRC("0","0")');
  });

  test('content after suspense is not blocked', async () => {
    const slow = timeout(50).then(() => 'slow');
    const page = html`<div>
      ${suspense(slow, html`loading`)}
      <p>after</p>
    </div>`;

    const chunks = await readStreamChunks(renderToStream(page));
    const joined = chunks.join('');

    // "after" should appear before the slow content resolves
    const afterIdx = joined.indexOf('<p>after</p>');
    const slowIdx = joined.indexOf('HS:0');
    expect(afterIdx).toBeGreaterThan(-1);
    expect(slowIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeLessThan(slowIdx);
  });

  test('multiple suspense boundaries', async () => {
    const fast = timeout(5).then(() => 'A');
    const slow = timeout(20).then(() => 'B');
    const page = html`${suspense(fast, html`fa`)}${suspense(slow, html`fb`)}`;
    const result = await readStream(renderToStream(page));

    expect(result).toContain('id="HB:0"');
    expect(result).toContain('id="HB:1"');
    expect(result).toContain('$HRC("0","0")');
    expect(result).toContain('$HRC("1","1")');
    expect(result).toContain('>A<');
    expect(result).toContain('>B<');
  });

  test('no suspense — works like normal streaming', async () => {
    const page = html`<div>hello</div>`;
    const result = await readStream(renderToStream(page));
    expect(result).toBe('<div>hello</div>');
  });

  test('deferred error without error handler — fallback remains, no swap', async () => {
    const throws = async () => {
      throw new Error('boom');
    };
    const page = html`<div>${suspense(throws, html`safe`)}</div>`;
    const result = await readStream(renderToStream(page));

    expect(result).toContain('safe');
    // No $HRC call for the failed deferred
    expect(result).not.toContain('$HRC("0","0")');
  });

  test('deferred error with fallback() — error UI replaces pending', async () => {
    const throws = async () => {
      throw new Error('boom');
    };
    const page = html`<div>
      ${fallback(suspense(throws, html`pending`), html`error-ui`)}
    </div>`;
    const result = await readStream(renderToStream(page));

    // Error UI is streamed via $HRC swap
    expect(result).toContain('error-ui');
    expect(result).toContain('$HRC("0","0")');
  });

  test('$HRC script definition injected once', async () => {
    const a = timeout(5).then(() => 'a');
    const b = timeout(10).then(() => 'b');
    const page = html`${suspense(a, html`la`)}${suspense(b, html`lb`)}`;
    const result = await readStream(renderToStream(page));

    // Function definition appears exactly once
    const defCount = (result.match(/window\.\$HRC=function/g) || []).length;
    expect(defCount).toBe(1);
  });
});

describe('suspense (concurrent renderToStream)', () => {
  test('two concurrent renders do not cross-contaminate deferreds', async () => {
    // Two pages with distinct content; both have await points that let
    // their generators interleave. With the old global-stack design, the
    // deferred of one request could be registered into the other's stream.
    const slowA = timeout(10).then(() => 'AAA');
    const slowB = timeout(10).then(() => 'BBB');
    const pageA = html`<div>${suspense(slowA, html`la`)}</div>`;
    const pageB = html`<div>${suspense(slowB, html`lb`)}</div>`;

    const [resultA, resultB] = await Promise.all([
      readStream(renderToStream(pageA)),
      readStream(renderToStream(pageB)),
    ]);

    // Each stream must contain only its own deferred content.
    expect(resultA).toContain('>AAA<');
    expect(resultA).not.toContain('>BBB<');
    expect(resultB).toContain('>BBB<');
    expect(resultB).not.toContain('>AAA<');
  });

  test('two concurrent renders produce independent ids', async () => {
    const slowA = timeout(5).then(() => 'A1');
    const slowB = timeout(5).then(() => 'B1');
    const pageA = html`${suspense(slowA, html`la`)}`;
    const pageB = html`${suspense(slowB, html`lb`)}`;

    const [resultA, resultB] = await Promise.all([
      readStream(renderToStream(pageA)),
      readStream(renderToStream(pageB)),
    ]);

    // Both get their own id:0 — proves contexts are isolated.
    expect(resultA).toContain('id="HB:0"');
    expect(resultB).toContain('id="HB:0"');
    expect(resultA).toContain('$HRC("0","0")');
    expect(resultB).toContain('$HRC("0","0")');
  });

  test('concurrent renders with nested fallback boundaries', async () => {
    const slowA = timeout(10).then(() => 'okA');
    const slowB = timeout(10).then(() => 'okB');
    const pageA = html`<div>
      ${fallback(suspense(slowA, html`la`), html`errA`)}
    </div>`;
    const pageB = html`<div>
      ${fallback(suspense(slowB, html`lb`), html`errB`)}
    </div>`;

    const [resultA, resultB] = await Promise.all([
      readStream(renderToStream(pageA)),
      readStream(renderToStream(pageB)),
    ]);

    expect(resultA).toContain('okA');
    expect(resultA).not.toContain('okB');
    expect(resultB).toContain('okB');
    expect(resultB).not.toContain('okA');
  });
});
