/**
 * @fileoverview Express Framework Adapter
 */

import express from 'express';

export function createExpressAdapter() {
  return {
    name: 'express',
    createApp: () => express(),
    registerRoute: (app, route, expected, description) => {
      app.get(route, (req, res) => {
        if (expected) {
          res.type(expected.contentType);
          if (expected.contentType.includes('application/json')) {
            res.json(JSON.parse(expected.content));
          } else {
            res.send(expected.content);
          }
        } else {
          res.send(description);
        }
      });
    },
    startServer: async (app) => {
      return new Promise((resolve) => {
        const server = app.listen(0, () => {
          const address = server.address();
          const port = typeof address === 'object' ? address?.port : 0;
          const baseUrl = `http://localhost:${port}`;
          console.log(`✅ express server started at ${baseUrl}`);
          resolve({ server, baseUrl });
        });
      });
    },
  };
}
