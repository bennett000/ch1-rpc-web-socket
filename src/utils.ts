/**
 * Utility functions
 */
import {
  Dictionary,
  RPC,
  RPCDefer,
  RPCNodeCallback,
  RPCEvent,
  RPCError,
  RPCErrorPayload,
  RPCInvocationPayload,
  RPCNotify,
  RPCReturnPayload,
} from './interfaces';
import { DEFAULT_ASYNC_TYPE } from './constants';

/**
 * This function is for creating new instances of functions.  This is handy for
 * "enhancing" and enforcing correctness with certain event emitter libraries
 *
 * __Note__ this function will likely not work with arrow functions
 *
 * __Note__ this function uses `new Function`.  Consequently functions will be
 * created in the global context.  In other words, make sure your function is
 * pure and does not rely on external variables, unless those variables are
 * global.
 */
export function createNewFunctionFrom(func: Function): Function {
  const rawFunctionString = func.toString();
  /** Eliminate references to Istanbul code coverage */
  const functionString = rawFunctionString.replace(/__cov_(.+?)\+\+;?/g, '');
  // proceed with normal logic
  const firstCurly = functionString.indexOf('{') + 1;
  const lastCurly = functionString.lastIndexOf('}');
  const firstBracket = functionString.indexOf('(') + 1;
  const lastBracket = functionString.indexOf(')');
  const functionContents = functionString.slice(firstCurly, lastCurly);
  const args = functionString
    .slice(firstBracket, lastBracket)
    .split(',')
    .filter(Boolean)
    .map(s => s.trim());

  return new Function(...args, functionContents);
}

export function isRPC<T>(arg: any): arg is RPC<T> {
  if (!arg) {
    return false;
  }
  if (!isFunction(arg.destroy)) {
    return false;
  }
  if (!arg.remote) {
    return false;
  }

  return true;
}

export const isRPCDefaultAsync = arg => {
  if (arg === DEFAULT_ASYNC_TYPE) {
    return true;
  }
  return false;
};

export function isDefer<T>(thing: any): thing is RPCDefer<T> {
  if (!thing) {
    return false;
  }
  if (!isFunction(thing.resolve)) {
    return false;
  }
  if (!isFunction(thing.reject)) {
    return false;
  }
  if (!isPromise(thing.promise)) {
    return false;
  }

  return true;
}

export function isError(err: any): err is Error {
  return err instanceof Error;
}

export function isFunction(fn: any): fn is Function {
  return typeof fn === 'function';
}

export function isObject(obj: any): obj is Object {
  if (!obj) {
    return false;
  }

  return typeof obj === 'object';
}

export function isString(arg: any): arg is string {
  return typeof arg === 'string';
}

export function isDictionary<T>(dict: any): dict is Dictionary<T> {
  return isObject(dict);
}

export function isPromise<T>(promise: any): promise is Promise<T> {
  if (!promise) {
    return false;
  }

  if (!isFunction(promise.then)) {
    return false;
  }

  if (!isFunction(promise.catch)) {
    return false;
  }

  return true;
}

export function isRPCNodeCallback<T>(arg: any): arg is RPCNodeCallback<T> {
  return isFunction(arg);
}

export function isRPCNotify<T>(arg: any): arg is RPCNotify<T> {
  return isFunction(arg);
}

export function isRPCEvent(event: any): event is RPCEvent {
  if (!event) {
    return false;
  }

  if (typeof event.uid !== 'string') {
    return false;
  }

  if (typeof event.type !== 'number') {
    return false;
  }

  if (
    isRPCErrorPayload(event.payload) ||
    isRPCInvocationPayload(event.payload) ||
    isRPCReturnPayload(event.payload)
  ) {
    return true;
  }

  return false;
}

export function isRPCError(error: any): error is RPCError {
  if (!error) {
    return false;
  }

  if (!error.message) {
    return false;
  }

  return true;
}

export function isRPCErrorPayload(payload: any): payload is RPCErrorPayload {
  if (!payload) {
    return false;
  }

  return isRPCError(payload.error);
}

export function isRPCInvocationPayload(
  payload: any,
): payload is RPCInvocationPayload {
  if (!payload) {
    return false;
  }

  if (!Array.isArray(payload.args)) {
    return false;
  }

  if (typeof payload.fn !== 'string') {
    return false;
  }

  return true;
}

export function isRPCReturnPayload(
  payload: any,
): payload is RPCReturnPayload {
  if (!payload) {
    return false;
  }

  return Array.isArray(payload.result);
}

export function noop(): void {}

export const pnoop: () => Promise<void> = () =>
  new Promise<void>(resolve => resolve());

export function createUidGenerator(): () => string {
  let uidCount = 0;
  const rpcId = Math.floor(Math.random() * 100000).toString(32);

  return () => {
    // increment the counter
    uidCount += 1;

    // return a uid
    return [rpcId, uidCount.toString(32)].join('-');
  };
}

export function defer<T>(): RPCDefer<T> {
  let pass = noop;
  let fail = noop;

  const promise = new Promise<T>((resolve, reject) => {
    pass = resolve;
    fail = reject;
  });

  return {
    promise,
    reject: fail,
    resolve: pass,
  };
}

export function createRangeError(message) {
  return new RangeError('js-rpc: ' + message);
}

export function createTypeError(message) {
  return new TypeError('js-rpc: ' + message);
}

export function rangeError(message) {
  throw createRangeError(message);
}

export function safeInstantiate(fn: Function, args: any[]) {
  try {
    return new (Function.prototype.bind.apply(fn, arguments))();
  } catch (err) {
    return err;
  }
}

export function safeInvoke(fn: Function, args: any[]) {
  try {
    return fn.apply(null, args);
  } catch (err) {
    return err;
  }
}

export function throwIfNotDefer(d: any, message?: string) {
  if (!isDefer(d)) {
    typeError(message || 'given value is not a defer');
  }
}

export function throwIfNotError(err: any, message?: string) {
  if (!isError(err)) {
    typeError(message || 'given value is not an Error');
  }
}

export function throwIfNotFunction(fn: any, message?: string) {
  if (!isFunction(fn)) {
    typeError(message || 'given value is not a function');
  }
}

export function throwIfNotRPCEvent(event: any, message?: string) {
  if (!isRPCEvent(event)) {
    typeError(message || 'given value is not an RPCEvent');
  }
}

export function throwIfNotObject(obj: any, message?: string) {
  if (!isObject(obj)) {
    typeError(message || 'given value is not an object');
  }
}

export function typeError(message) {
  throw createTypeError(message);
}
