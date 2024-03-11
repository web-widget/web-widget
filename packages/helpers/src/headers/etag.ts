type Algorithm = {
  name: string;
  alias: string;
};

type Data =
  | string
  | boolean
  | number
  | object
  | ArrayBufferView
  | ArrayBuffer
  | ReadableStream;

const sha1 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'SHA-1', alias: 'sha1' };
  const hash = await createHash(data, algorithm);
  return hash;
};

const createHash = async (
  data: Data,
  algorithm: Algorithm
): Promise<string | null> => {
  let sourceBuffer: ArrayBufferView | ArrayBuffer;

  if (data instanceof ReadableStream) {
    let body = '';
    const reader = data.getReader();
    await reader?.read().then(async (chuck) => {
      const value = await createHash(chuck.value || '', algorithm);
      body += value;
    });
    return body;
  }
  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    sourceBuffer = data;
  } else {
    if (typeof data === 'object') {
      // eslint-disable-next-line no-param-reassign
      data = JSON.stringify(data);
    }
    sourceBuffer = new TextEncoder().encode(String(data));
  }

  if (crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      {
        name: algorithm.name,
      },
      sourceBuffer as ArrayBuffer
    );
    const hash = Array.prototype.map
      .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
      .join('');
    return hash;
  }
  return null;
};

export async function etag(entity: Data, options: { weak?: boolean } = {}) {
  if (entity == null) {
    throw new TypeError('argument entity is required');
  }

  const hash = await sha1(entity);
  return options.weak ? `W/"${hash}"` : `"${hash}"`;
}
