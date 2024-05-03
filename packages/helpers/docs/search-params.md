# searchParams

`searchParams` is a function that allows you to retrieve the query string from the current URL.

## Examples

```ts
import { searchParams } from '@web-widget/helpers/navigation';

export default () => {
  const id = searchParams().get('id');
  return (
    <>ID: {id}</>
  );
};
```

## Environment

`server` `client`

## Syntax

```ts
searchParams();
```

## Returns

`useSearchParams` returns a [`Web URLSearchParams interface`](https://developer.mozilla.org/docs/Web/API/URLSearchParams).

- [`getAll()`](https://developer.mozilla.org/docs/Web/API/URLSearchParams/getAll)
- [`keys()`](https://developer.mozilla.org/docs/Web/API/URLSearchParams/keys)
- [`values()`](https://developer.mozilla.org/docs/Web/API/URLSearchParams/values)
- [`entries()`](https://developer.mozilla.org/docs/Web/API/URLSearchParams/entries)
- [`forEach()`](https://developer.mozilla.org/docs/Web/API/URLSearchParams/forEach)
- [`toString()`](https://developer.mozilla.org/docs/Web/API/URLSearchParams/toString)
