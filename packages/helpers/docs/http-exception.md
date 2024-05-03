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
