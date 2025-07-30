/**
 * @fileoverview Simple URLPattern-based Framework Adapter
 * This is a minimal implementation to test if URLPattern is the performance bottleneck
 */

import { createServer } from 'node:http';

export default {
  name: 'urlpattern-simple',
  // Check if URLPattern is available in current Node.js version
  isSupported: () => {
    try {
      new URLPattern({ pathname: '/test' });
      return true;
    } catch (error) {
      return false;
    }
  },
  createApp: () => {
    return { routes: [], patterns: [] };
  },
  registerRoute: ({ routes, patterns }, route, expected, description) => {
    // Create URLPattern for the route
    const pattern = new URLPattern({ pathname: route });
    patterns.push(pattern);

    routes.push({
      pattern,
      expected,
      description,
    });
  },
  startServer: async ({ routes, patterns }) => {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        // Find matching route using URLPattern
        for (const route of routes) {
          const match = route.pattern.exec(url);
          if (match) {
            if (route.expected) {
              res.writeHead(route.expected.status, {
                'Content-Type': route.expected.contentType,
              });
              res.end(route.expected.content);
            } else {
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end(route.description);
            }
            return;
          }
        }

        // No match found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      server.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'object' ? address?.port : 0;
        const baseUrl = `http://localhost:${port}`;
        // Server started successfully
        resolve({ server, baseUrl });
      });
    });
  },
};
