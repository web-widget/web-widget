import { randomUUID } from 'node:crypto';

export interface ServerRenderResult {
  body: string;
  headers?: Record<string, string>;
  status: number;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function errorDocument(status: number, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>${status}</title></head><body><main data-production-error="${status}"><h1>${message}</h1></main></body></html>`;
}

export function renderRequest(url: URL, template: string): ServerRenderResult {
  if (url.pathname === '/redirect') {
    return {
      body: '',
      headers: { location: '/route-a' },
      status: 302,
    };
  }

  if (url.pathname === '/error') {
    return { body: errorDocument(500, 'Internal Server Error'), status: 500 };
  }

  if (!['/', '/route-a', '/route-b'].includes(url.pathname)) {
    return { body: errorDocument(404, 'Not Found'), status: 404 };
  }

  const pathname = escapeAttribute(url.pathname);
  const requestId = randomUUID();
  return {
    body: template
      .replace(
        '</head>',
        `<meta name="request-path" content="${pathname}"><meta name="request-id" content="${requestId}"></head>`
      )
      .replace(
        'data-testid="fixture"',
        `data-testid="fixture" data-request-path="${pathname}" data-request-id="${requestId}"`
      ),
    headers: { 'x-request-id': requestId },
    status: 200,
  };
}
