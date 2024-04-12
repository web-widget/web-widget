import { sha1 } from '../crypto';

export async function etag(
  entity: Parameters<typeof sha1>[0],
  options: { weak?: boolean } = {}
) {
  if (entity == null) {
    throw new TypeError('Argument entity is required.');
  }

  const hash = await sha1(entity);
  return options.weak ? `W/"${hash}"` : `"${hash}"`;
}
