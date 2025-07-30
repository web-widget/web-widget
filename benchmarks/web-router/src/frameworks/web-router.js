/**
 * @fileoverview Web Router Framework Adapter (Direct Mode)
 */

import WebRouter from '@web-widget/web-router';
import NodeAdapter from '@web-widget/node';
import { createServer } from 'node:http';

export function createWebRouterAdapter() {
  return {
    name: 'web-router',
    createApp: () => {
      return new WebRouter();
    },
    registerRoute: (app, route, expected, description) => {
      app.get(route, () => {
        if (expected) {
          const headers = { 'Content-Type': expected.contentType };
          if (expected.contentType.includes('application/json')) {
            return new Response(expected.content, { headers });
          } else {
            return new Response(expected.content, { headers });
          }
        }
        return new Response(description);
      });
    },
    startServer: async (app) => {
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
          console.log(`✅ web-router server started at ${baseUrl}`);
          resolve({ server: httpServer, baseUrl });
        });
      });
    },
  };
}
