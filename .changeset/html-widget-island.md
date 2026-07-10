---
'@web-widget/html': minor
---

Add `widget()` function to embed framework widgets (React, Vue, Vue2, etc.)
as interactive islands in HTML templates. The widget renders server-side as
a `<web-widget>` element and hydrates client-side via the existing custom
element lifecycle — no host template framework needed.

```ts
import { html, render, widget, fallback } from '@web-widget/html';

export { render };

export default function Page() {
  return html`<div>
    <h1>Dashboard</h1>
    ${fallback(
      widget(() => import('./Counter@widget.tsx'), { data: { count: 1 } }),
      () => html`<div>Widget failed</div>`
    )}
  </div>`;
}
```
