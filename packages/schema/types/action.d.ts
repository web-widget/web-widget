/**
 * Action module type definitions.
 *
 * This module defines the types for action handlers that can be called
 * from the client to perform server-side operations. Actions provide
 * a way to execute server-side logic in response to client requests.
 *
 * @module Action Module Types
 */

import { SerializableValue } from './http';

/**
 * Represents a module that contains action handlers.
 * Actions are functions that can be called from the client to perform server-side operations.
 */
export interface ActionModule {
  /** Action handlers mapped by method name. */
  [method: string]: ActionHandler;
}

/**
 * Represents an action handler function that can be called from the client.
 * Action handlers receive arguments and return a promise with the result.
 */
export interface ActionHandler<
  A extends SerializableValue = SerializableValue,
  T extends SerializableValue = SerializableValue,
> {
  /**
   * Executes the action with the provided arguments.
   * @param args - The arguments passed to the action handler.
   * @returns A promise that resolves to the action result.
   */
  (...args: A[]): Promise<T>;
}
