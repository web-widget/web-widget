# context

This function allows getting the context of a route and is available both on the server and client sides.

## Examples

```tsx
import { context } from '@web-widget/helpers/context';

export default () => {
  const { request, params, state } = context();
  return (
    <ul>
      <li>Url: {request.url}</li>
      <li>Params: {params}</li>
    </ul>
  );
};
```

## Environment

`server` `client`

## Syntax

```ts
context();
```

## Returns

[`MiddlewareContext`](https://github.com/web-widget/web-widget/blob/main/packages/schema/schema.d.ts)

- `params`
- `request`
- `state`
- ...

## Limit

Based on security considerations, the Request and RouteState information obtained by the `context` function in the client is incomplete.
