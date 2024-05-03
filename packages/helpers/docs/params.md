# params

`params` is a function that allows you to get dynamic parameters from the current URL. It works in both server and client.

## Examples

```tsx
import { params } from '@web-widget/helpers/navigation';

export default () => {
  const { id } = params<{ id: string }>();
  return <>ID: {id}</>;
};
```

## Environment

`server` `client`

## Syntax

```ts
params();
```

## Returns

`useParams` returns an object containing the current route's filled in dynamic parameters.

- Each property in the object is an active dynamic segment.
- The properties name is the segment's name, and the properties value is what the segment is filled in with.
- The properties value will either be a `string` or array of `string`'s depending on the type of dynamic segment.
- If the route contains no dynamic parameters, `useParams` returns an empty object.
- If used in Pages Router, `useParams` will return `null` on the initial render and updates with properties following the rules above once the router is ready.

For example:

| Route                                     | URL         | Params                    |
| ----------------------------------------- | ----------- | ------------------------- |
| `routes/news/page.js`                     | `/news`     | `{}`                      |
| `routes/news/[slug]/index@route.js`       | `/news/1`   | `{ slug: '1' }`           |
| `routes/news/[tag]/[item]/index@route.js` | `/news/1/2` | `{ tag: '1', item: '2' }` |
| `routes/news/[...slug]/index@route.js`    | `/news/1/2` | `{ slug: ['1', '2'] }`    |
