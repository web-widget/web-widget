/**
 * lit-html compatible directives.
 *
 * Provides: `classMap`, `styleMap`, `ifDefined`, `when`, `join`.
 */

import type { HTMLContent, HTMLContentStatic, Renderable } from './html';

/** Converts a camelCase CSS property name to kebab-case. Preserves custom properties (--*). */
function toKebabCase(str: string): string {
  if (str.startsWith('--')) return str;
  return str.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase());
}

/**
 * Converts an object of class names to a space-separated class string.
 * Only truthy values are included.
 *
 * @example
 * html`<div class="${classMap({ active: true, disabled: false })}">`
 * // => <div class="active">
 */
export function classMap(classes: Readonly<Record<string, unknown>>): string {
  return Object.entries(classes)
    .filter(([, value]) => value)
    .map(([name]) => name)
    .join(' ');
}

/**
 * Converts an object of CSS properties to a semicolon-separated style string.
 * CamelCase property names are converted to kebab-case; null/empty values are omitted.
 *
 * @example
 * html`<div style="${styleMap({ color: 'red', fontSize: '16px' })}">`
 * // => <div style="color: red; font-size: 16px">
 */
export function styleMap(styles: Readonly<Record<string, string>>): string {
  return Object.entries(styles)
    .filter(([, value]) => value != null && value !== '')
    .map(([prop, value]) => `${toKebabCase(prop)}: ${value}`)
    .join('; ');
}

/**
 * Returns the value if defined, otherwise empty string.
 * Useful for optional attribute values.
 *
 * @example
 * html`<a href="${ifDefined(url)}">link</a>`
 */
export function ifDefined<T>(value: T | undefined): T | '' {
  return value ?? '';
}

/**
 * Conditional rendering: renders `trueCase` when `condition` is truthy,
 * otherwise renders `falseCase` (or nothing if omitted).
 *
 * @example
 * html`<div>${when(isLoading, html`Loading...`, html`Done`)}</div>`
 */
export function when(
  condition: unknown,
  trueCase: HTMLContent,
  falseCase?: HTMLContent
): HTMLContent {
  return condition ? trueCase : (falseCase ?? '');
}

/**
 * Joins an iterable of items with a separator between each pair.
 *
 * @example
 * html`<nav>${join(links, html`<span class="sep">|</span>`)}</nav>`
 */
export function join(
  items: Iterable<HTMLContent>,
  separator: HTMLContent
): HTMLContentStatic {
  const sep = typeof separator === 'function' ? separator() : separator;
  const result: Renderable[] = [];
  let first = true;
  for (const item of items) {
    if (!first) result.push(sep as Renderable);
    result.push((typeof item === 'function' ? item() : item) as Renderable);
    first = false;
  }
  return result;
}
