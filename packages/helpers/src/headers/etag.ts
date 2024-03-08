// Based on the code in the MIT licensed `etag` package.
async function entityTag(entity: string) {
  if (entity.length === 0) {
    // fast-path empty
    return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';
  }

  // compute hash of entity
  const encoder = new TextEncoder();
  const data = encoder.encode(entity);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = btoa(String.fromCharCode(...hashArray)).substring(0, 27);

  // compute length of entity
  const len = data.length;

  return '"' + len.toString(16) + '-' + hash + '"';
}

export async function etag(entity: string, options: { weak?: boolean } = {}) {
  if (entity == null) {
    throw new TypeError('argument entity is required');
  }

  const tag = await entityTag(entity);
  return options.weak ? `W/${tag}` : tag;
}
