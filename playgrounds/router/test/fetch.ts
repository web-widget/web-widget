import webRouter from '../entry.server';

const PORT = Number(process.env.TEST_PORT ?? 51204);
const ORIGIN = `http://localhost:${PORT}`;

export default async function fetch(pathname: string, options?: RequestInit) {
  return webRouter.dispatch(`${ORIGIN}${pathname}`, options);
}
