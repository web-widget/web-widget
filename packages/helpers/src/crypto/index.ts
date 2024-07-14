interface Algorithm {
  name: string;
  alias: string;
}

type Data = string | ArrayBufferView | ArrayBuffer | ReadableStream;

export const sha256 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'SHA-256', alias: 'sha256' };
  const hash = await createHash(data, algorithm);
  return hash;
};

export const sha1 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'SHA-1', alias: 'sha1' };
  const hash = await createHash(data, algorithm);
  return hash;
};

export const md5 = async (data: Data) => {
  const algorithm: Algorithm = { name: 'MD5', alias: 'md5' };
  const hash = await createHash(data, algorithm);
  return hash;
};

function concatArrayBuffers(chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    } else {
      chunks.push(value);
    }
  }
  return concatArrayBuffers(chunks);
}

export const createHash = async (
  data: Data,
  algorithm: Algorithm
): Promise<string | null> => {
  let sourceBuffer: ArrayBufferView | ArrayBuffer;

  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    sourceBuffer = data;
  } else if (typeof data === 'string') {
    sourceBuffer = new TextEncoder().encode(String(data));
  } else if (data instanceof ReadableStream) {
    sourceBuffer = await streamToArrayBuffer(data);
  } else {
    throw new TypeError('Argument data is invalid.');
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
