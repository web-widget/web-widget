/**
 * @fileoverview Web Router Framework Adapter (Direct Mode - No Adapter)
 * Uses Node.js native Web API support without NodeAdapter
 */

import WebRouter from '@web-widget/web-router';
import { createServer } from 'node:http';

export default {
  name: 'web-router#direct',
  // Check if required Web APIs are available
  isSupported: () => {
    try {
      // Check for essential Web APIs
      const requiredAPIs = [
        'Request',
        'Response',
        'Headers',
        'URLPattern',
        'ReadableStream',
        'fetch',
      ];

      for (const api of requiredAPIs) {
        if (typeof globalThis[api] === 'undefined') {
          return false;
        }
      }

      // Test URLPattern functionality
      const pattern = new URLPattern({ pathname: '/test' });
      const match = pattern.exec({ pathname: '/test' });
      if (!match) {
        return false;
      }

      // Test Request/Response creation
      const request = new Request('http://localhost/test');
      const response = new Response('test');
      if (!request || !response) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },
  createApp: () => {
    return new WebRouter({
      onFallback: (error) => {
        if (error.status >= 500) {
          console.log(`❌ web-router#direct server failed: ${error.message}`);
        }
      },
    });
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
    return new Promise((resolve) => {
      // Create HTTP server that directly uses Web API
      const server = createServer(async (req, res) => {
        try {
          // Convert Node.js request to Web API Request
          const url = new URL(req.url, `http://${req.headers.host}`);
          const request = new Request(url, {
            method: req.method,
            headers: req.headers,
            // Only add body for non-GET/HEAD requests
            ...(req.method !== 'GET' && req.method !== 'HEAD'
              ? { body: req }
              : {}),
          });

          // Create environment object
          const env = process.env;

          // Create FetchEvent-like object
          const event = {
            request,
            waitUntil: () => {},
          };

          // Call web-router handler directly
          const response = await app.handler(request, env, event);

          // Convert Web API Response back to Node.js response
          if (!response) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }

          // Set headers
          const headers = {};
          for (const [key, value] of response.headers) {
            headers[key] = value;
          }

          res.writeHead(response.status, response.statusText, headers);

          // Handle response body
          if (response.body) {
            const reader = response.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } finally {
              reader.releaseLock();
            }
          }

          res.end();
        } catch (error) {
          console.error('Request handling error:', error);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
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
