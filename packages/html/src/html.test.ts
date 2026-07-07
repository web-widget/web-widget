import { html, unsafeHTML, fallback } from './html';
import type { HTML } from './html';

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
});
