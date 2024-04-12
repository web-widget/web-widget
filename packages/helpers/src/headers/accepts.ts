// Based on the code in the MIT licensed `hono` package.
export type AcceptHeader =
  | 'Accept'
  | 'Accept-Charset'
  | 'Accept-Encoding'
  | 'Accept-Language'
  | 'Accept-Patch'
  | 'Accept-Post'
  | 'Accept-Ranges';

export interface Accept {
  type: string;
  params: Record<string, string>;
  quality: number;
}

export interface acceptsConfig {
  header: AcceptHeader;
  supports: string[];
  default: string;
}

export interface acceptsOptions extends acceptsConfig {
  match?: (accepts: Accept[], config: acceptsConfig) => string;
}

export const parseAccept = (acceptHeader: string) => {
  // Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
  const accepts = acceptHeader.split(','); // ['text/html', 'application/xhtml+xml', 'application/xml;q=0.9', 'image/webp', '*/*;q=0.8']
  return accepts.map((accept) => {
    const [type, ...params] = accept.trim().split(';'); // ['application/xml', 'q=0.9']
    const quality = params.find((param) => param.startsWith('q=')); // 'q=0.9'
    return {
      type,
      params: params.reduce((acc, param) => {
        const [key, value] = param.split('=');
        return { ...acc, [key.trim()]: value.trim() };
      }, {}),
      quality: quality ? parseFloat(quality.split('=')[1]) : 1,
    };
  });
};

export const defaultMatchAccept = (
  accepts: Accept[],
  config: acceptsConfig
) => {
  const { supports, default: defaultSupport } = config;
  const accept = accepts
    .sort((a, b) => b.quality - a.quality)
    .find((accept) => supports.includes(accept.type));
  return accept ? accept.type : defaultSupport;
};

/**
 * Match the accept header with the given options.
 * @example
 * ```ts
 * const lang = matchAccepts(req, {
 *   header: 'Accept-Language',
 *   supports: ['en', 'zh'],
 *   default: 'en',
 * });
 */
export const matchAccepts = (headers: Headers, options: acceptsOptions) => {
  const acceptHeader = headers.get(options.header);
  if (!acceptHeader) {
    return options.default;
  }
  const accepts = parseAccept(acceptHeader);
  const match = options.match || defaultMatchAccept;

  return match(accepts, options);
};
