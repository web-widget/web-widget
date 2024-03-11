import { etag } from './etag';

describe('etag', () => {
  it('should calculate entity tag', async () => {
    const entity = 'Hello, world!';
    const result = await etag(entity);
    expect(result).toBe(`"943a702d06f34599aee1f8da8ef9f7296031d699"`);
  });

  it('should return a specific tag for empty entity', async () => {
    const entity = '';
    const result = await etag(entity);
    expect(result).toBe(`"da39a3ee5e6b4b0d3255bfef95601890afd80709"`);
  });

  it('should calculate strong ETag', async () => {
    const entity = 'Hello, world!';
    const result = await etag(entity, { weak: false });
    expect(result).toBe(`"943a702d06f34599aee1f8da8ef9f7296031d699"`);
  });

  it('should calculate weak ETag', async () => {
    const entity = 'Hello, world!';
    const result = await etag(entity, { weak: true });
    expect(result).toBe(`W/"943a702d06f34599aee1f8da8ef9f7296031d699"`);
  });
});
