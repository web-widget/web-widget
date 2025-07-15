/**
 * Widget module type definitions.
 *
 * This module defines the types for widget modules that can be either
 * server-side or client-side. Widgets are reusable components that can
 * be embedded in different contexts and provide both rendering and metadata.
 *
 * @module Widget Module Types
 */

import { Meta } from './meta';
import { ServerRender, ClientRender } from './render';

/**
 * Represents a widget module that can be either server-side or client-side.
 * Widgets are reusable components that can be embedded in different contexts.
 */
export type WidgetModule = ServerWidgetModule | ClientWidgetModule;

/**
 * Represents a server-side widget module.
 * Server widgets are rendered on the server and can be hydrated on the client.
 */
export interface ServerWidgetModule {
  /** The default export of the widget module (usually the component). */
  default?: unknown;
  /** Metadata for the widget, including HTML head elements. */
  meta?: Meta;
  /** Server-side render function for the widget. */
  render?: ServerRender;
}

/**
 * Represents a client-side widget module.
 * Client widgets are rendered entirely on the client side.
 */
export interface ClientWidgetModule {
  /** The default export of the widget module (usually the component). */
  default?: unknown;
  /** Metadata for the widget, including HTML head elements. */
  meta?: Meta;
  /** Client-side render function for the widget. */
  render?: ClientRender;
}
