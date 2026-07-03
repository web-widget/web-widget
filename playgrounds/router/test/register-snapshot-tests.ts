import type { expect as vitestExpect, test as vitestTest } from 'vitest';
import { SNAPSHOT_ROUTES } from './snapshot-routes';

type Expect = typeof vitestExpect;
type Test = typeof vitestTest;

export type SnapshotFetch = (
  pathname: string,
  options?: RequestInit
) => Promise<Response>;

export type RegisterSnapshotTestsOptions = {
  test: Test;
  expect: Expect;
  fetch: SnapshotFetch;
  normalizeHeaders?: (headers: Headers) => Record<string, string>;
  normalizeBody?: (body: string) => string;
};

export function registerSnapshotTests({
  test,
  expect,
  fetch,
  normalizeHeaders = (headers) => Object.fromEntries(headers.entries()),
  normalizeBody = (body) => body,
}: RegisterSnapshotTestsOptions) {
  test.each(SNAPSHOT_ROUTES)(
    'Request "%s" should match snapshot',
    async (pathname, status = 200, replace = (body: string) => body) => {
      const result = await fetch(pathname);
      expect(result.status).toBe(status);
      expect(result.statusText).toMatchSnapshot(`${pathname}@statusText`);
      expect(normalizeHeaders(result.headers)).toMatchSnapshot(
        `${pathname}@headers`
      );
      expect(normalizeBody(replace(await result.text()))).toMatchSnapshot(
        `${pathname}@body`
      );
    }
  );
}
