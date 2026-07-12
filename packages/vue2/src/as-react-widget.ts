import type { Component, ComponentPublicInstance } from 'vue';
import type { DefaultProps } from 'vue/types/options';
import type { ReactWidgetComponent } from '@web-widget/react/adapter';

/**
 * Adapt Vue component types to React widget component types.
 *
 * This is a type-level cast only — the actual cross-framework rendering
 * is handled by the `@widget` system. Use this when importing a Vue
 * widget (e.g. `Counter@widget.vue`) into a React/JSX file so that
 * TypeScript treats it as a React component.
 */
export /*#__PURE__*/ function asReactWidget<T extends DefaultProps>(
  component: Component<never, never, never, T, never>
) {
  return component as unknown as ReactWidgetComponent<
    Omit<T, keyof ComponentPublicInstance | '$route' | '$router'>
  >;
}

/** @deprecated Use `asReactWidget` instead. */
export const toReact = asReactWidget;
