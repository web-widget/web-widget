import { renderToReadableStream as _renderToReadableStream } from 'react-dom/server.edge';
import { prerender as _prerender } from 'react-dom/static.edge';
import type {
  renderToReadableStream as RenderToReadableStream,
  RenderToReadableStreamOptions,
} from 'react-dom/server';
import type { PrerenderOptions } from 'react-dom/static';
import type { ReactNode } from 'react';

declare global {
  interface ReadableStream {
    [Symbol.asyncIterator](): AsyncIterator<ArrayBuffer | Uint8Array>;
  }
}

const prerender = _prerender;
const renderToReadableStream: typeof RenderToReadableStream =
  _renderToReadableStream;

export type PrerenderToStringOptions = PrerenderOptions;

async function prerenderToString(
  vNode: ReactNode,
  options: RenderToReadableStreamOptions
): Promise<string> {
  return readableStreamToString(
    (await prerender(vNode, options as any)).prelude
  );
}

async function readableStreamToString(readableStream: ReadableStream) {
  let result = '';
  const textDecoder = new TextDecoder();
  for await (const chunk of readableStream) {
    result += textDecoder.decode(chunk, { stream: true });
  }
  result += textDecoder.decode(); // flush end character
  return result;
}

export { prerenderToString, renderToReadableStream };
export type { RenderToReadableStreamOptions };
