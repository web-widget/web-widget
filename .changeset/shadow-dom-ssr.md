---
'@web-widget/web-widget': minor
'@web-widget/html': minor
'@web-widget/preact': minor
'@web-widget/react': minor
'@web-widget/solid': minor
'@web-widget/svelte': minor
'@web-widget/vite-plugin': minor
'@web-widget/vue': minor
'@web-widget/vue2': minor
---

Add experimental Shadow DOM SSR boundaries with declarative shadow roots,
native slot projection, isolated widget styles, and an internal HTMLElement
mount root shared by framework adapters.

Widget `meta.style` and stylesheet links are installed in shadow boundaries on
the server and client. Solid widgets conservatively fall back to client
rendering inside isolated shadow roots until their hydration key namespace can
be made root-local. Browsers without native Declarative Shadow DOM parsing use
a client-side fallback before custom elements are registered.

The new `webWidgetPlugin.defaults` option configures the default `loading` and
`renderTarget` values for transformed Widget containers. In shadow mode, route
asset collection omits Widget CSS from the document head and keeps it in each
shadow boundary. Explicit container options override the injected defaults.

In development, Vite-transformed Widget CSS is embedded in declarative shadow
roots and tracked by stable style IDs for HMR. CSS updates invalidate the
server importer chain so CSS Modules class maps and shadow-local selectors stay
in sync after reloads.
