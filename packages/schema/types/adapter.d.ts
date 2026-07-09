/**
 * Adapter type definitions.
 *
 * This module defines the WebWidgetAdapter protocol — a framework-agnostic
 * adapter interface that connects build tools with UI framework adapters.
 * The adapter tells the build tool which files belong to which framework
 * and where to obtain the rendering implementation, enabling framework
 * source code to be transformed at build time into generic modules
 * conforming to the ServerRender / ClientRender contract.
 *
 * @module Adapter Types
 */

import type { ServerRender, ClientRender } from './render';
import type { WidgetModule } from './widget';

/**
 * The WebWidgetAdapter protocol.
 *
 * A framework-agnostic adapter interface that connects build tools with
 * UI framework adapters. It tells the build tool which files belong to
 * which framework and where to obtain the rendering implementation.
 */
export interface WebWidgetAdapter {
  /**
   * Adapter format version. Build tools use this for compatibility
   * checking. When the format evolves with incompatible changes (e.g.
   * field semantics change, required fields added), the major version
   * number is incremented.
   */
  version: string;

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
   * Runtime module subpath, pointing to the runtime implementation
   * provided by the adapter package via conditional exports.
   *
   * Build tools inject exports from this module into matching modules:
   * - `render`: injected as module export to conform to
   *   ServerRender / ClientRender contract
   * - `container`: wraps widget importers for cross-framework reuse
   *
   * e.g. "./runtime" resolves to "@web-widget/react/runtime",
   * then conditional exports select server or client implementation
   * based on environment.
   */
  runtime: string;

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
 */
export type Loader = () => Promise<WidgetModule>;

/**
 * Container function: converts a generic module into the current
 * framework's native component, supporting cross-framework interop.
 *
 * The returned component can be used like a normal framework component
 * (e.g. React.FC, Vue.Component) — it accepts props, participates in
 * rendering, and internally runs the widget's render function.
 */
export interface Container {
  (
    loader: Loader,
    options?: {
      /** Loading timing: `lazy` (default) loads on first render,
       *  `eager` loads on module resolution. */
      loading?: 'lazy' | 'eager';
      /** Rendering stage. */
      renderStage?: string;
    }
  ): unknown;
}

/**
 * Runtime module contract.
 *
 * The module pointed to by the adapter package's `runtime` subpath
 * must export these members.
 */
export type RuntimeModule = {
  /**
   * Render function, injected as module export to conform to
   * ServerRender / ClientRender contract.
   */
  render: ServerRender | ClientRender;

  /**
   * Container function, converts generic module to current framework's
   * native component for cross-framework interop.
   */
  container: Container;
};
