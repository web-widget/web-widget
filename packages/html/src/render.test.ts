import { html, suspense, fallback } from './html';
import {
  renderToString,
  streamToAsyncIter,
  asyncIterToStream,
  unsafeStreamToHTML,
  streamToHTML,
} from './render';

const timeout = (n: number) => new Promise((r) => setTimeout(r, n));

// ---------------------------------------------------------------------------
// renderToString
// ---------------------------------------------------------------------------

describe('renderToString', () => {
  test('renders simple template', async () => {
    expect(await renderToString(html`<div>hi</div>`)).toBe('<div>hi</div>');
  });

  test('renders with escaping', async () => {
    expect(await renderToString(html`<div>${'<b>'}</div>`)).toBe(
      '<div>&lt;b&gt;</div>'
    );
  });

  test('renders async content (passthrough mode)', async () => {
    const slow = timeout(10).then(() => 'late');
    expect(await renderToString(html`<div>${slow}</div>`)).toBe(
      '<div>late</div>'
    );
  });

  test('suspense blocks on content in renderToString', async () => {
    const slow = timeout(10).then(() => html`<p>resolved</p>`);
    const page = html`<div>${suspense(slow, html`loading`)}</div>`;
    expect(await renderToString(page)).toBe('<div><p>resolved</p></div>');
  });

  test('suspense error propagates to fallback in renderToString', async () => {
    const throws = async () => {
      throw new Error('boom');
    };
    // prettier-ignore
    const page = html`<div>${fallback(suspense(throws, html`pending`), html`err`)}</div>`;
    expect(await renderToString(page)).toBe('<div>err</div>');
  });

  test('nested templates', async () => {
    // prettier-ignore
    const page = html`<ul>${[1, 2, 3].map((n) => html`<li>${n}</li>`)}</ul>`;
    expect(await renderToString(page)).toBe(
      '<ul><li>1</li><li>2</li><li>3</li></ul>'
    );
  });
});

// ---------------------------------------------------------------------------
// streamToAsyncIter / asyncIterToStream
// ---------------------------------------------------------------------------

describe('streamToAsyncIter', () => {
  test('converts a ReadableStream to async iterable', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('a');
        controller.enqueue('b');
        controller.close();
      },
    });
    const chunks: string[] = [];
    for await (const c of streamToAsyncIter(stream)) {
      chunks.push(c);
    }
    expect(chunks).toEqual(['a', 'b']);
  });

  test('handles empty stream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
    const chunks: string[] = [];
    for await (const c of streamToAsyncIter(stream)) {
      chunks.push(c);
    }
    expect(chunks).toEqual([]);
  });

  test('early break releases reader lock', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
      },
    });
    const chunks: number[] = [];
    for await (const c of streamToAsyncIter(stream)) {
      chunks.push(c);
      break;
    }
    expect(chunks).toEqual([1]);
    // After break, reader should be released/cancelled — stream is disturbed
    expect(stream.locked).toBe(false);
  });
});

describe('asyncIterToStream', () => {
  /** Reads a ReadableStream<string> into a single string. */
  async function readStringStream(
    stream: ReadableStream<string>
  ): Promise<string> {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += value;
    }
    return result;
  }

  test('converts a sync iterable to ReadableStream', async () => {
    const stream = asyncIterToStream(['x', 'y', 'z']);
    expect(await readStringStream(stream)).toBe('xyz');
  });

  test('converts an async iterable to ReadableStream', async () => {
    async function* gen() {
      yield '1';
      await timeout(5);
      yield '2';
    }
    const stream = asyncIterToStream(gen());
    expect(await readStringStream(stream)).toBe('12');
  });

  test('empty iterable produces empty stream', async () => {
    const stream = asyncIterToStream([]);
    expect(await readStringStream(stream)).toBe('');
  });

  test('propagates errors from iterable', async () => {
    async function* gen() {
      yield 'ok';
      throw new Error('stream-error');
    }
    const stream = asyncIterToStream(gen());
    await expect(readStringStream(stream)).rejects.toThrow('stream-error');
  });
});

// ---------------------------------------------------------------------------
// unsafeStreamToHTML / streamToHTML
// ---------------------------------------------------------------------------

function byteStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

describe('unsafeStreamToHTML', () => {
  test('decodes byte chunks into UnsafeHTML', async () => {
    const stream = byteStream([
      new TextEncoder().encode('<b>hel'),
      new TextEncoder().encode('lo</b>'),
    ]);
    const parts = [];
    for await (const part of unsafeStreamToHTML(stream)) {
      parts.push(part.toString());
    }
    expect(parts.join('')).toBe('<b>hello</b>');
  });

  test('handles multi-byte UTF-8 across chunk boundaries', async () => {
    // "é" = 0xC3 0xA9, split across chunks
    const stream = byteStream([new Uint8Array([0xc3]), new Uint8Array([0xa9])]);
    const parts = [];
    for await (const part of unsafeStreamToHTML(stream)) {
      parts.push(part.toString());
    }
    expect(parts.join('')).toBe('é');
  });
});

describe('streamToHTML', () => {
  test('decodes byte chunks into strings', async () => {
    const stream = byteStream([
      new TextEncoder().encode('foo'),
      new TextEncoder().encode('bar'),
    ]);
    const parts = [];
    for await (const part of streamToHTML(stream)) {
      parts.push(part);
    }
    expect(parts).toEqual(['foo', 'bar']);
  });

  test('empty stream yields no chunks', async () => {
    const stream = byteStream([]);
    const parts = [];
    for await (const part of streamToHTML(stream)) {
      parts.push(part);
    }
    expect(parts).toEqual([]);
  });
});
