import type { HtmlWidgetComponent } from './runtime.server';

/**
 * Adapt a framework component type to an HTML widget component type.
 *
 * This is a type-level cast only — the actual cross-framework rendering
 * is handled by the `@widget` system. Use this when importing a widget
 * (e.g. `Counter@widget.tsx`) into an HTML template file so that
 * TypeScript treats it as a callable returning `Promise<UnsafeHTML>`.
 *
 * For function components (React, Solid, etc.), the props type `T` is
 * automatically inferred from the component's first parameter. For
 * object-based components (Vue, Vue2), specify `T` manually.
 *
 * @example
 * ```ts
 * // React: T is inferred as { count: number }
 * import ReactCounter from './Counter@widget.tsx';
 * const Counter = asHtmlWidget(ReactCounter);
 * Counter({ count: 1 });
 *
 * // Vue: T must be specified manually
 * import VueCounter from './Counter@widget.vue';
 * const Counter = asHtmlWidget<{ count: number }>(VueCounter);
 * Counter({ count: 1 });
 * ```
 */
export /*#__PURE__*/ function asHtmlWidget<T = unknown>(
  component: unknown
): HtmlWidgetComponent<T> {
  return component as unknown as HtmlWidgetComponent<T>;
}
