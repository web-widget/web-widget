export const METHOD_NAME_ALL = 'ALL' as const;
export const METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'options',
  'patch',
] as const;

const URL_PART_KEYS_LITERAL = [
  'protocol',
  'hostname',
  'port',
  'pathname',
  'search',
  'hash',
] as const;

const URL_PART_KEYS_PRIORITY: (keyof RoutePattern)[] = [
  ...URL_PART_KEYS_LITERAL,
].reverse();

type Params = Readonly<Record<string, string>>;
type Result<T> = [T, Params, URLPattern][];
type Route<T> = [pattern: URLPattern, method: string, handler: T];

export type RoutePattern = {
  username?: string;
  password?: string;
  protocol?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
};

export interface Router<T> {
  add(method: string, input: RoutePattern, handler: T): void;
  match(method: string, input: RoutePattern): Result<T>;
}

export class UnsupportedPathError extends Error {}

export class URLPatternRouter<T> implements Router<T> {
  #routes: Route<T>[] = [];

  add(method: string, input: RoutePattern, handler: T) {
    try {
      this.#routes.push([new URLPattern(input), method, handler]);
    } catch (error) {
      throw new UnsupportedPathError('Invalid URLPattern input.', {
        cause: error,
      });
    }
  }

  match(method: string, input: RoutePattern): Result<T> {
    const handlers: Result<T> = [];

    for (const [currentPattern, currentMethod, currentHandler] of this
      .#routes) {
      if (currentMethod !== METHOD_NAME_ALL && currentMethod !== method) {
        continue;
      }

      const matched = currentPattern.exec(input);
      if (!matched) {
        continue;
      }

      const params = this.#extractParams(matched);
      handlers.push([currentHandler, params, currentPattern]);
    }

    return handlers;
  }

  #extractParams(matched: URLPatternResult): Params {
    const numberRegex = /^\d+$/;
    return Object.freeze(
      URL_PART_KEYS_PRIORITY.reduce((allParams, type) => {
        const groups = (matched[type] as URLPatternComponentResult)?.groups;
        if (!groups) {
          return allParams;
        }

        for (const [key, value] of Object.entries(groups)) {
          if (
            value !== undefined &&
            (!numberRegex.test(key) || type === 'pathname')
          ) {
            allParams[key] = decodeURIComponent(value);
          }
        }

        return allParams;
      }, Object.create(null))
    );
  }
}
