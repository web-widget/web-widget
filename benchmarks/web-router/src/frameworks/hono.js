/**
 * @fileoverview Hono Framework Adapter
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';

export default {
  name: 'hono',
  createApp: () => new Hono(),
  registerRoute: (app, route, expected, description) => {
    app.get(route, (c) => {
      if (expected) {
        c.header('Content-Type', expected.contentType);
        if (expected.contentType.includes('application/json')) {
          return c.json(JSON.parse(expected.content));
        } else {
          return c.text(expected.content);
        }
      }
      return c.text(description);
    });
  },
  startServer: async (app) => {
    return new Promise((resolve) => {
      const server = serve({ fetch: app.fetch, port: 0 }, (info) => {
        const baseUrl = `http://localhost:${info.port}`;
        // Server started successfully
        resolve({ server, baseUrl });
      });
    });
  },
};
