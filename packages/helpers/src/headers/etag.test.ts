import { etag } from './etag';

describe('etag', () => {
  it('should calculate entity tag', async () => {
    const entity = 'Hello, world!';
    const result = await etag(entity);
    expect(result).toBe(`"d-lDpwLQbzRZmu4fjajvn3KWAx1pk"`);
  });

  it('should return a specific tag for empty entity', async () => {
    const entity = '';
    const result = await etag(entity);
    expect(result).toBe(`"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"`);
  });

  it('should calculate strong ETag', async () => {
    const entity = 'Hello, world!';
    const result = await etag(entity, { weak: false });
    expect(result).toBe(`"d-lDpwLQbzRZmu4fjajvn3KWAx1pk"`);
  });

  it('should calculate weak ETag', async () => {
    const entity = 'Hello, world!';
    const result = await etag(entity, { weak: true });
    expect(result).toBe(`W/"d-lDpwLQbzRZmu4fjajvn3KWAx1pk"`);
  });
});
