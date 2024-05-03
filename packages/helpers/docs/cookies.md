# cookies

This function allows reading or writing `cookies` on the server side.

The available methods are based on the [`Web CookieStore interface`](https://wicg.github.io/cookie-store/#CookieStore). The main difference is that the methods are not asynchronous so they do not return a `Promise`.

## Examples

### for Request

```ts
import { cookies } from '@web-widget/helpers/headers';

export const handler = async () => {
  const cookieStore = cookies();
  cookieStore.get('cookie-name')?.value; // undefined | string
  cookieStore.has('cookie-name'); // boolean
  // do something...
};
```

### for Response

```ts
import { cookies } from '@web-widget/helpers/headers';

export const handler = async () => {
  const cookieKey = 'cookie-name';
  const headers = new Headers();
  const cookieStore = cookies(headers);

  cookieStore.set('cookie-name', 'cookie-value', { maxAge: 1000 }); // make cookie persistent for 1000 seconds
  cookieStore.delete('old-cookie');

  return new Response(null, {
    headers,
    status: 200,
  });
};
```

## Environment

`server`

## Syntax

```ts
cookies();
cookies(headers);
```

## Parameters

- `headers` (optional): Response [Web Headers interface](https://developer.mozilla.org/docs/Web/API/Headers).

## Returns

### `get(name)`

A method that takes a cookie `name` and returns an object with `name` and `value`. If a cookie with `name` isn't found, it returns `undefined`. If multiple cookies match, it will only return the first match.

### `getAll()`

A method that is similar to `get`, but returns a list of all the cookies with a matching `name`. If `name` is unspecified, it returns all the available cookies.

### `has(name)`

A method that takes a cookie `name` and returns a `boolean` based on if the cookie exists (`true`) or not (`false`).

### `set(name, value, options)`

A method that takes an object with properties of `CookieListItem` as defined in the [W3C CookieStore interface](https://wicg.github.io/cookie-store/#dictdef-cookielistitem) spec.

### `delete(name)`

A method that takes either a cookie `name` or a list of names. and removes the cookies matching the name(s). Returns `true` for deleted and `false` for undeleted cookies.

## Limit

- It only makes sense to use it on the server side.
- To write cookies, you can only operate in routes or middleware.
