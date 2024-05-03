# redirect

The redirect function allows you to redirect the user to another URL.

## Examples

```ts
import { redirect } from '@web-widget/helpers/navigation';

export const handler = async () => {
  return redirect('/');
};
```

## Environment

`server`

## Syntax

```ts
redirect(path);
redirect(path, status);
```

## Parameters

`path`: The URL to redirect to. Can be a relative or absolute path.

`status`: HTTP status code.

## Returns

`redirect` returns a [`Web Response interface`](https://developer.mozilla.org/docs/Web/API/Response).
