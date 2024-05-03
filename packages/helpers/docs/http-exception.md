# HTTPException

This is an HTTP exception interface.

## Examples

```ts
import { HTTPException } from '@web-widget/helpers/error';

export const handler = async () => {
  throw new HTTPException(404, 'Resource not found');
};
```

## Environment

`server`

## Syntax

```ts
new HTTPException(code);
new HTTPException(code, message);
new HTTPException(code, message, options);
```

## Parameters

- `code`: HTTP status code to set.
- `message` (optional): Human-readable error message.
- `options` (optional): [Error options](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error/Error#options).

## Returns

Returns an HTTPException object that inherits the [Error interface](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error/Error).

## Notes

`@web-widget/web-router` can automatically render different error pages based on error status codes.
