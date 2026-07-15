import { describe, expect, test } from '@jest/globals';
import { hasDefaultExport } from './module-exports';

describe('hasDefaultExport', () => {
  test.each([
    'export default function Page() {}',
    'const Page = () => null; export default Page;',
    'const Page = () => null; export { Page as default };',
    "export { default } from './Page';",
  ])('accepts a default export: %s', async (code) => {
    await expect(hasDefaultExport(code, '/project/page.ts')).resolves.toBe(
      true
    );
  });

  test('rejects a route with named exports only', async () => {
    await expect(
      hasDefaultExport(
        'export const handler = { GET() { return new Response(); } };',
        '/project/api@route.ts'
      )
    ).resolves.toBe(false);
  });
});
