// This utility is based on https://github.com/ako-deno/http_errors
// License: https://raw.githubusercontent.com/ako-deno/http_errors/master/LICENSE

import { STATUS_TEXT, Status } from '../status';

export abstract class HttpError extends Error {
  name: string;
  message: string;
  status: number;
  statusText: string;
  expose: boolean = false;
  [key: string]: any;
  constructor(code: number, message?: string, options?: ErrorOptions) {
    super(message, options);
    if (!Status[code]) {
      throw TypeError(`Unknown HTTP Status Code \`${code}\``);
    }
    if (code < 400 || code >= 600) {
      throw TypeError(
        `Only 4xx or 5xx status codes allowed, but got \`${code}\``
      );
    }
    if (code >= 400 && code < 500) {
      this.expose = true;
    }

    let className = Status[code];
    if (!className.endsWith('Error')) {
      className += 'Error';
    }
    const msg = message != null ? message : STATUS_TEXT[code as Status];
    this.message = msg;
    this.status = code;
    this.statusText = STATUS_TEXT[code as Status];
    this.name = className;

    // support Node.js
    if (Reflect.has(Error, 'captureStackTrace')) {
      (Error as any).captureStackTrace(this, this.constructor);
    }

    Reflect.setPrototypeOf(this, new.target.prototype);
  }

  toString() {
    return `${this.name} [${this.status}]: ${this.message}`;
  }

  toJSON() {
    return {
      name: this.name,
      status: this.status,
      statusText: this.statusText,
      message: this.message,
    };
  }

  static isHttpError(error: any) {
    const keys = ['name', 'message', 'status', 'statusText'];
    return error && !keys.some((key) => !Reflect.has(error, key));
  }
}

class HttpErrorImpl extends HttpError {}

export interface HttpErrorProperties {
  [key: string]: any;
}

export interface IError extends Error {
  status: number;
  expose: boolean;
  [key: string]: any;
}

/**
 * Create a new HttpError.
 *
 * @returns {HttpError}
 * @public
 */

export function createHttpError(
  status: number,
  message?: string,
  props?: HttpErrorProperties
): HttpError;
export function createHttpError(
  status: number,
  err: Error,
  props?: HttpErrorProperties
): IError;
export function createHttpError(
  status: any,
  message?: any,
  props?: HttpErrorProperties
): HttpError | Error {
  let err, errOptions;
  if (typeof message === 'string') {
    err = new HttpErrorImpl(status, message);

    // support Node.js
    if (Reflect.has(Error, 'captureStackTrace')) {
      (Error as any).captureStackTrace(err, createHttpError);
    }
  } else if (message instanceof Error) {
    err = message as IError;
    message = err.message;
    errOptions = { cause: err };
    status = err.status;

    if (
      typeof status !== 'number' ||
      (!Status[status] && (status < 400 || status >= 600))
    ) {
      status = 500;
    }

    err = new HttpErrorImpl(status, message, errOptions);
  } else {
    err = new HttpErrorImpl(status);

    // support Node.js
    if (Reflect.has(Error, 'captureStackTrace')) {
      (Error as any).captureStackTrace(err, createHttpError);
    }
  }

  if (!(err instanceof HttpError) || err.status !== status) {
    // add properties to generic error
    err.expose = status < 500;
    err.status = status;
  }

  if (props) {
    for (let key in props) {
      if (key !== 'status') {
        err[key] = props[key];
      }
    }
  }

  return err;
}
