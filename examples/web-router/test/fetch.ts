import { fileURLToPath } from 'node:url';
import webRouter from '../entry.server';

const PORT = Number(process.env.VITE_PORT ?? 3000);
const ORIGIN = `http://localhost:${PORT}`;
const MONOREPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// NOTE: Removed the window variable to prevent some libraries from working
Reflect.deleteProperty(globalThis, 'window');
console.info('TEST ORIGIN', ORIGIN);

export default async function fetch(pathname: string, options?: RequestInit) {
  const response = await webRouter.request(`${ORIGIN}${pathname}`, options);

  const res = new Response(response.body, response);
  const text = res.text;

  // NOTE: Remove date to make the snapshot stable.
  res.headers.delete('date');
  res.headers.delete('x-module-source');
  res.text = async () => {
    const t = await text.call(res);
    // NOTE: Replace monorepo root with a placeholder to make the snapshot stable.
    return t.replaceAll(MONOREPO_ROOT, '#TEST_MONOREPO_ROOT#');
  };

  return res;
}
