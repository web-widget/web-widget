# headers

The `headers` function allows reading HTTP incoming request headers.

## Examples

```ts
import { headers } from '@web-widget/helpers/headers';

export const handler = async () => {
  const ua = headers().get('User-Agent');
  return new Response(`User-Agent: ${ua}`);
};
```

## Environment

`server` `client`

## Syntax

```ts
headers();
```

## Returns

`headers` returns a read-only version of the [Web Headers interface](https://developer.mozilla.org/docs/Web/API/Headers).

- [`entries()`](https://developer.mozilla.org/docs/Web/API/Headers/entries): Returns an [`iterator`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Iteration_protocols) allowing to go through all key/value pairs contained in this object.
- [`forEach()`](https://developer.mozilla.org/docs/Web/API/Headers/forEach): Executes a provided function once for each key/value pair in this `Headers` object.
- [`get()`](https://developer.mozilla.org/docs/Web/API/Headers/get): Returns a [`String`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) sequence of all the values of a header within a `Headers` object with a given name.
- [`has()`](https://developer.mozilla.org/docs/Web/API/Headers/has): Returns a boolean stating whether a `Headers` object contains a certain header.
- [`keys()`](https://developer.mozilla.org/docs/Web/API/Headers/keys): Returns an [`iterator`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Iteration_protocols) allowing you to go through all keys of the key/value pairs contained in this object.
- [`values()`](https://developer.mozilla.org/docs/Web/API/Headers/values): Returns an [`iterator`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Iteration_protocols) allowing you to go through all values of the key/value pairs contained in this object.

## Limit

The `headers` function only has complete functionality on the server side. If used on the client, only access to `user-agent`, `cookie`, `host`, `origin`, `referer`, `accept-language` is allowed. Header.
