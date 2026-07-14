import type { Component, ComponentPublicInstance } from 'vue';
import type { DefaultProps } from 'vue/types/options';
import type { ReactWidgetComponent } from '@web-widget/react/adapter';

/**
 * Adapt Vue component types to React widget component types.
 *
 * @deprecated Use `container()` from `@web-widget/react/adapter` instead.
 * The build tool automatically infers props types for both static imports
 * and explicit `container(() => import(...))` calls.
 *
 * This is a type-level cast only — the actual cross-framework rendering
 * is handled by the `@widget` system.
 */
export /*#__PURE__*/ function asReactWidget<T extends DefaultProps>(
  component: Component<never, never, never, T, never>
) {
  return component as unknown as ReactWidgetComponent<
    Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>
  >;
}

/** @deprecated Use `container()` from `@web-widget/react/adapter` instead. */
export const toReact = asReactWidget;
