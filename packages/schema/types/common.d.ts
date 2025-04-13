export type Serializable =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Serializable }
  | Serializable[];

/** @deprecated Use Serializable instead. */
export type SerializableValue = Serializable;

export interface HTTPException extends Error {
  expose?: boolean;
  status?: number;
  statusText?: string;
}

export interface State extends Record<string, unknown> {}

export type KnownMethods =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'OPTIONS'
  | 'PATCH';

export type FetchEventLike = Pick<
  FetchEvent,
  'request' | 'respondWith' | 'waitUntil'
>;

export interface FetchContext<Params = Record<string, string>>
  extends Omit<FetchEventLike, 'respondWith'> {
  /**
   * Errors in the current route.
   */
  error?: HTTPException;

  /**
   * The parameters that were matched from the route.
   *
   * For the `/foo/:bar` route with url `/foo/123`, `params` would be
   * `{ bar: '123' }`. For a route with no matchers, `params` would be `{}`. For
   * a wildcard route, like `/foo/:path*` with url `/foo/bar/baz`, `params` would
   * be `{ path: 'bar/baz' }`.
   */
  params: Readonly<Params>;

  /**
   * The state of the application, the content comes from the middleware.
   */
  readonly state: State;

  /** @deprecated */
  readonly name?: string;

  /**
   * The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered.
   * @deprecated
   */
  readonly pathname: string;
}

export interface Meta {
  /**
   * The base URL of the document.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/base)
   */
  base?: BaseDescriptor;

  /** Description of the document. */
  description?: string;

  /** Document Keywords. */
  keywords?: string;

  /** Document language. */
  lang?: string;

  /**
   * Document links.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/link)
   */
  link?: LinkDescriptor[];

  /**
   * Document metadata.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/meta)
   */
  meta?: MetaDescriptor[];

  /**
   * Document scripts.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/script)
   */
  script?: ScriptDescriptor[];

  /**
   * Document styles.
   * [MDN Reference](https://developer.mozilla.org/docs/Web/HTML/Element/style)
   */
  style?: StyleDescriptor[];

  /** Document title. */
  title?: string;
}

export interface ElementDescriptor {
  /** The ID of the element. */
  id?: string;

  /** The cryptographic nonce used for inline scripts. */
  nonce?: string;

  /** The title of the element. */
  title?: string;

  /** Custom data attributes. */
  [key: `data-${string}`]: string | undefined;
}

export interface BaseDescriptor extends ElementDescriptor {
  /** The URL of the linked resource. */
  href?: string;

  /** The browsing context for the hyperlink. */
  target?: string;
}

export interface LinkDescriptor extends ElementDescriptor {
  /** The destination for the link. */
  as?: string;

  /** The CORS setting for the link. */
  crossorigin?: string;

  /** Whether the link is disabled. */
  disabled?: string;

  /** The fetch priority for the link. */
  fetchpriority?: 'high' | 'low' | 'auto';

  /** The URL of the linked resource. */
  href?: string;

  /** The language of the linked resource. */
  hreflang?: string;

  /** The sizes of the images for different viewport sizes. */
  imagesizes?: string;

  /** The source set for responsive images. */
  imagesrcset?: string;

  /** The integrity metadata for the link. */
  integrity?: string;

  /** The media attribute for the link. */
  media?: string;

  /** The referrer policy for the link. */
  referrerpolicy?: string;

  /** The relationship between the current document and the linked resource. */
  rel?: string;

  /** The MIME type of the linked resource. */
  type?: string;
}

export interface MetaDescriptor extends ElementDescriptor {
  /** The character encoding for the HTML document. */
  charset?: string;

  /** The value of the meta element. */
  content?: string;

  /** The pragma directive for the meta element. */
  'http-equiv'?: string;

  /** The media attribute for the meta element. */
  media?: string;

  /** The name of the meta element. */
  name?: string;

  /** The property attribute for the meta element. */
  property?: string;
}

export interface ScriptDescriptor extends ElementDescriptor {
  /** Whether the script should be executed asynchronously. */
  async?: string;

  /** The value of the script element. */
  content?: string;

  /** The CORS setting for the script. */
  crossorigin?: string;

  /** Whether the script should be executed after the document has been parsed. */
  defer?: string;

  /** The fetch priority for the script. */
  fetchpriority?: 'high' | 'low' | 'auto';

  /** The integrity metadata for the script. */
  integrity?: string;

  /** Whether the script should not be executed in modules. */
  nomodule?: string;

  /** The referrer policy for the script. */
  referrerpolicy?: string;

  /** The URL of the external script. */
  src?: string;

  //  text: string;

  /** The MIME type of the script. */
  type?: string;
}

export interface StyleDescriptor extends ElementDescriptor {
  /** The value of the style element. */
  content?: string;

  /** Whether the style is disabled. */
  disabled?: string;

  /** The media attribute for the style element. */
  media?: string;
}

// export interface TitleDescriptor {
//   content?: string;
// }
