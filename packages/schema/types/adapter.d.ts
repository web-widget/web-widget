/**
 * Adapter type definitions.
 *
 * This module defines the WidgetTransform protocol — a framework-agnostic
 * transform definition that connects build tools with UI framework adapters.
 * The transform tells the build tool which files belong to which framework
 * and where to obtain the rendering implementation, enabling framework
 * source code to be transformed at build time into generic modules
 * conforming to the ServerRender / ClientRender contract.
 *
 * @module Adapter Types
 */

import type { ServerRender, ClientRender } from './render';
import type { WidgetModule } from './widget';
import type { Meta } from './meta';

/** Detect an unconstrained parameter without framework-specific types. */
type IsAnyOrUnknown<T> = unknown extends T ? true : false;

/**
 * Extract public props from a framework component using stable structural
 * signatures shared by the supported adapters.
 */
export type ExtractComponentProps<C> =
  // Vue components expose public props on their instance constructor.
  C extends new (...args: any[]) => { $props: infer P }
    ? P
    : C extends (
          first: infer First,
          second: infer Second,
          ...args: any[]
        ) => any
      ? // Svelte 5 receives (internals, props). Preact's second argument is any.
        IsAnyOrUnknown<Second> extends true
        ? First
        : Second
      : C extends (props: infer P, ...args: any[]) => any
        ? P
        : unknown;

/** Extract props from the default export of a widget module. */
export type ExtractWidgetProps<M> = M extends { default: infer C }
  ? ExtractComponentProps<C>
  : unknown;

/**
 * The WidgetTransform protocol.
 *
 * A framework-agnostic transform definition that connects build tools with
 * UI framework adapters. It tells the build tool which files belong to
 * which framework and where to obtain the rendering implementation.
 */
export interface WidgetTransform {
  /**
   * UI framework identifier, used to distinguish handlers when multiple
   * frameworks coexist. Also the key used to reference the adapter in
   * build tool configuration.
   */
  name: string;

  /**
   * List of component file extensions.
   * Build tools use this to determine which source files belong to this
   * framework and need render transformation.
   * e.g. [".tsx", ".jsx"] matches all React components.
   */
  extensions: string[];

  /**
   * Unresolved adapter module ID, pointing to the implementation provided
   * by the adapter package via conditional exports.
   *
   * Build tools inject exports from this module into matching modules:
   * - `render`: injected as module export to conform to
   *   ServerRender / ClientRender contract
   * - `widget`: wraps widget importers for cross-framework reuse
   *
   * e.g. "@web-widget/react/adapter" is resolved by the target build so
   * conditional exports can select the server or client implementation.
   */
  adapter: string;

  /**
   * Optional: derive named exports from the default export.
   *
   * Some adapters produce modules that only have a default export.
   * This field tells the build tool to derive named exports from
   * properties of the default export object, with fallback defaults.
   *
   * Applied only to route modules (files matching a module marker
   * that contains "route").
   */
  deriveExports?: DeriveExport[];
}

/**
 * Describes a named export to derive from another export.
 */
export interface DeriveExport {
  /** The export name to derive (e.g. "handler", "meta"). */
  name: string;
  /** The source export to derive from. @default "default" */
  from?: string;
  /** Fallback default value if the property is not present. */
  default: string;
}

/**
 * Generic module loader, returns a module conforming to WidgetModule.
 *
 * @typeParam M - The concrete module type. Defaults to `WidgetModule`.
 *   When the loader returns a typed module (e.g. from a `.vue.d.ts`),
 *   the concrete M flows through to `widget()`'s generic inference.
 */
export type WidgetModuleLoader<M extends WidgetModule = WidgetModule> =
  () => Promise<M>;

/** Pending and error UI accepted by a widget container. */
export type WidgetContainerFallback<TPending, TError = TPending> =
  TPending | { pending?: TPending; error?: TError };

export type WidgetContainerRenderMode =
  | {
      /** Render on the server only and do not load or mount the widget on the client. */
      serverOnly: true;
      /** Mutually exclusive with `serverOnly`. */
      clientOnly?: never;
    }
  | {
      /** Skip server rendering and mount the widget only on the client. */
      clientOnly: true;
      /** Mutually exclusive with `clientOnly`. */
      serverOnly?: never;
    }
  | {
      /** Allow the widget to render on both server and client. */
      serverOnly?: false;
      /** Allow the widget to render on both server and client. */
      clientOnly?: false;
    };

/** Options accepted by a framework adapter when defining a widget container. */
export interface WidgetContainerOptions {
  /** Client-side module loading strategy. */
  loading?: 'auto' | 'lazy' | 'eager' | 'idle';
  /** Metadata contributed by the widget. */
  meta?: Meta;
  /** Diagnostic name for the widget container. */
  name?: string;
  /** Rendering boundary used by the widget container. */
  root?: 'light' | 'shadow';
}

/** Standard attributes applied to the generated Web Widget host element. */
export interface WidgetHostProps {
  /** Assign this widget host to a native Shadow DOM slot. */
  slot?: string;
}

/** Per-use props passed through a framework widget container. */
export type WidgetContainerProps<TPending = never, TError = TPending> = {
  /** ID assigned to this Web Widget element instance. */
  id?: string;
  /** UI shown while rendering is pending and, optionally, when rendering fails. */
  fallback?: WidgetContainerFallback<TPending, TError>;
  /** Override the widget's client-side module loading strategy for this use. */
  loading?: WidgetContainerOptions['loading'];
} & WidgetContainerRenderMode;

/**
 * Container function: converts a generic module into the current
 * framework's native component, supporting cross-framework interop.
 *
 * The returned component can be used like a normal framework component
 * (e.g. React.FC, Vue.Component) — it accepts props, participates in
 * rendering, and internally runs the widget's render function.
 *
 * Each framework adapter provides its own concrete `widget` with a
 * generic signature that infers the props type from the loader's module
 * type, e.g.:
 *
 * ```typescript
 * // @web-widget/react
 * function widget<M>(loader: () => Promise<M>): ReactWidgetComponent<ExtractProps<M>>;
 * ```
 */
export interface WidgetContainer {
  <M extends WidgetModule>(
    loader: WidgetModuleLoader<M>,
    options?: WidgetContainerOptions
  ): unknown;
}

/**
 * Adapter module contract.
 *
 * The module pointed to by the adapter package's `adapter` subpath
 * must export these members.
 */
export interface AdapterModule {
  /**
   * Render function, injected as module export to conform to
   * ServerRender / ClientRender contract.
   */
  render: ServerRender | ClientRender;

  /**
   * Container function, converts generic module to current framework's
   * native component for cross-framework interop.
   */
  widget: WidgetContainer;
}
