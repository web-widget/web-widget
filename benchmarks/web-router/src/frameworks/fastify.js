/**
 * @fileoverview Fastify Framework Adapter
 */

import Fastify from 'fastify';

export default {
  name: 'fastify',
  createApp: () => Fastify(),
  registerRoute: (app, route, expected, description) => {
    app.get(route, async (request, reply) => {
      if (expected) {
        reply.type(expected.contentType);
        if (expected.contentType.includes('application/json')) {
          return JSON.parse(expected.content);
        } else {
          return expected.content;
        }
      }
      return description;
    });
  },
  startServer: async (app) => {
    return new Promise((resolve) => {
      app.listen({ port: 0 }, (err, address) => {
        if (err) {
          console.log(`❌ fastify server failed: ${err.message}`);
          resolve(null);
          return;
        }
        const baseUrl = address;
        // Server started successfully
        resolve({ server: app, baseUrl });
      });
    });
  },
};
