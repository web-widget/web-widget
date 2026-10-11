---
'@web-widget/html': minor
---

Add lit-html compatible directives for HTML templates. Five directive
functions are now available with signatures matching their lit-html
counterparts, easing migration from lit-html.

- `classMap(classes)` — joins truthy class names into a space-separated string
- `styleMap(styles)` — converts a style object to a CSS string, with
  camelCase → kebab-case conversion and CSS custom property (`--*`) support
- `ifDefined(value)` — returns empty string for `undefined`, useful for
  optional attributes
- `when(condition, trueCase, falseCase?)` — conditional rendering with
  optional else branch
- `join(items, separator)` — renders an iterable with a separator between
  each pair

Unlike lit-html's directives, these are stateless value transformers that
work without any framework runtime.
