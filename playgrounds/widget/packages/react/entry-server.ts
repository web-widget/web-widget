import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';
import { PassThrough } from 'stream';

function asyncRenderToString(element: React.ReactElement): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const stream = new PassThrough();
    let html = '';

    stream.on('data', (chunk) => {
      html += chunk.toString();
    });

    stream.on('end', () => {
      resolve(html);
    });

    stream.on('error', (err) => {
      reject(err);
    });

    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(stream);
      },
      onError(err) {
        reject(err);
      },
    });
  });
}

export async function render() {
  const html = await asyncRenderToString(
    React.createElement(React.StrictMode, null, React.createElement(App))
  );
  return { html };
}
