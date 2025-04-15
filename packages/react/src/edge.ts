// @ts-ignore
import { renderToReadableStream as _renderToReadableStream } from 'react-dom/server.edge';
import type {
  ReactDOMServerReadableStream,
  renderToReadableStream as RenderToReadableStream,
  RenderToReadableStreamOptions,
} from 'react-dom/server';
// @ts-ignore
import { prerender as _prerender } from 'react-dom/static.edge';
import type {
  prerender as Prerender,
  PrerenderOptions,
} from 'react-dom/static';
import { ReactNode } from 'react';

const prerender: typeof Prerender = _prerender;
const renderToReadableStream: typeof RenderToReadableStream =
  _renderToReadableStream;

type RenderToStringOptions = PrerenderOptions;

async function renderToString(
  vNode: ReactNode,
  options: RenderToReadableStreamOptions
): Promise<string> {
  return readableStreamToString((await prerender(vNode, options)).prelude);
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

export {
  renderToString,
  RenderToStringOptions,
  renderToReadableStream,
  RenderToReadableStreamOptions,
  ReactDOMServerReadableStream,
};
