import { createServer } from 'node:net';

/** Reserve a free TCP port on 127.0.0.1 for short-lived test servers. */
export function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port =
        typeof address === 'object' && address ? address.port : undefined;

      if (!port) {
        server.close(() =>
          reject(new Error('Failed to resolve ephemeral port'))
        );
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}
