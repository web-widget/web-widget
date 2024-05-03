# url

`url` returns the URL of the current route.

## Examples

```ts
import { url } from '@web-widget/helpers/navigation';

export default () => {
  const { pathname } = url();
  return (
    <>Pathname: {pathname}</>
  );
};
```

## Environment

`server` `client`

## Syntax

```ts
url();
```

## Returns

`url` returns a [`Web URL interface`](https://developer.mozilla.org/docs/Web/API/URL).

- [`hash`](https://developer.mozilla.org/docs/Web/API/URL/hash): A string containing a `'#'` followed by the fragment identifier of the URL.
- [`host`](https://developer.mozilla.org/docs/Web/API/URL/host): A string containing the domain (that is the _hostname_) followed by (if a port was specified) a `':'`and the _port_ of the URL.
- [`hostname`](https://developer.mozilla.org/docs/Web/API/URL/hostname): A string containing the domain of the URL.
- [`href`](https://developer.mozilla.org/docs/Web/API/URL/href): A [stringifier](https://developer.mozilla.org/docs/Glossary/Stringifier) that returns a string containing the whole URL.
- [`origin`](https://developer.mozilla.org/docs/Web/API/URL/origin) Read only: Returns a string containing the origin of the URL, that is its scheme, its domain and its port.
- [`password`](https://developer.mozilla.org/docs/Web/API/URL/password): A string containing the password specified before the domain name.
- [`pathname`](https://developer.mozilla.org/docs/Web/API/URL/pathname): A string containing an initial `'/'` followed by the path of the URL, not including the query string or fragment.
- [`port`](https://developer.mozilla.org/docs/Web/API/URL/port): A string containing the port number of the URL.
- [`protocol`](https://developer.mozilla.org/docs/Web/API/URL/protocol): A string containing the protocol scheme of the URL, including the final `':'`.
- [`search`](https://developer.mozilla.org/docs/Web/API/URL/search): A string indicating the URL's parameter string; if any parameters are provided, this string includes all of them, beginning with the leading `?` character.
- [`searchParams`](https://developer.mozilla.org/docs/Web/API/URL/searchParams) Read only A [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams) object which can be used to access the individual query parameters found in `search`.
- [`username`](https://developer.mozilla.org/docs/Web/API/URL/username): A string containing the username specified before the domain name.
