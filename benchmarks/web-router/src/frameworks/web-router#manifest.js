/**
 * @fileoverview Web Router Framework Adapter (Manifest Mode)
 */

import WebRouter from '@web-widget/web-router';
import NodeAdapter from '@web-widget/node';
import { createServer } from 'node:http';

export default {
  name: 'web-router#manifest',
  createApp: () => {
    return { routes: [], expectedResponses: {} };
  },
  registerRoute: (
    { routes, expectedResponses },
    route,
    expected,
    description
  ) => {
    routes.push({
      pathname: route,
      module: {
        handler: {
          GET() {
            if (expected) {
              const headers = { 'Content-Type': expected.contentType };
              if (expected.contentType.includes('application/json')) {
                return new Response(expected.content, { headers });
              } else {
                return new Response(expected.content, { headers });
              }
            }
            return new Response(description);
          },
        },
      },
    });
    expectedResponses[route] = expected;
  },
  startServer: async ({ routes }) => {
    const manifest = { routes };
    const app = WebRouter.fromManifest(manifest, {
      onFallback: (error) => {
        if (error.status >= 500) {
          console.log(`❌ web-router#manifest server failed: ${error.message}`);
        }
      },
    });
    const adapter = new NodeAdapter(app, {
      defaultOrigin: 'http://localhost:0',
    });

    return new Promise((resolve) => {
      const server = adapter.handler;
      const httpServer = createServer(server);

      httpServer.listen(0, () => {
        const address = httpServer.address();
        const port = typeof address === 'object' ? address?.port : 0;
        const baseUrl = `http://localhost:${port}`;
        // Server started successfully
        resolve({ server: httpServer, baseUrl });
      });
    });
  },
};
