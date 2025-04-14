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

const prerender: typeof Prerender = _prerender;
const renderToReadableStream: typeof RenderToReadableStream =
  _renderToReadableStream;

export {
  prerender,
  PrerenderOptions,
  renderToReadableStream,
  RenderToReadableStreamOptions,
  ReactDOMServerReadableStream,
};
