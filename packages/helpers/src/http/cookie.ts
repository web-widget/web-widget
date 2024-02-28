// Based on the code in the MIT licensed `hono` package.
import {
  parse,
  parseSigned,
  serialize,
  serializeSigned,
} from '../utils/cookie';
import type { CookieOptions, Cookie, SignedCookie } from '../utils/cookie';

interface GetCookie {
  (request: Request, key: string): string | undefined;
  (request: Request): Cookie;
}

interface GetSignedCookie {
  (
    request: Request,
    secret: string | BufferSource,
    key: string
  ): Promise<string | undefined | false>;
  (request: Request, secret: string): Promise<SignedCookie>;
}

export const getCookie: GetCookie = (request, key?) => {
  const cookie = request.headers.get('Cookie');
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined;
    }
    const obj = parse(cookie, key);
    return obj[key];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj as any;
};

export const getSignedCookie: GetSignedCookie = async (
  request,
  secret,
  key?
) => {
  const cookie = request.headers.get('Cookie');
  if (typeof key === 'string') {
    if (!cookie) {
      return undefined;
    }
    const obj = await parseSigned(cookie, secret, key);
    return obj[key];
  }
  if (!cookie) {
    return {};
  }
  const obj = await parseSigned(cookie, secret);
  return obj as any;
};

export const setCookie = (
  response: Response,
  name: string,
  value: string,
  opt?: CookieOptions
): void => {
  const cookie = serialize(name, value, { path: '/', ...opt });
  response.headers.append('set-cookie', cookie);
};

export const setSignedCookie = async (
  response: Response,
  name: string,
  value: string,
  secret: string | BufferSource,
  opt?: CookieOptions
): Promise<void> => {
  const cookie = await serializeSigned(name, value, secret, {
    path: '/',
    ...opt,
  });
  response.headers.append('set-cookie', cookie);
};

export const deleteCookie = (
  response: Response,
  name: string,
  opt?: CookieOptions
): void => {
  setCookie(response, name, '', { ...opt, maxAge: 0 });
};
