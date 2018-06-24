/**
 * Functions for working with different types of errors
 */
import { CodedError, RPCConfig, RPCError } from './interfaces';
import { throwIfNotError } from './utils';

/* Why do we need to fight typescript's es5 mode on this? */
interface NamedFunction extends Function {
  name: string;
}

export function createRPCError(c: RPCConfig, error: CodedError): RPCError {
  throwIfNotError(error);

  let stack = '';
  const err = <NamedFunction>error.constructor;
  const errorType = err.name || 'Error';

  if (c.enableStackTrace) {
    stack = error.stack;
  }

  return {
    code: error.code,
    message: error.message,
    stack,
    type: errorType,
  };
}

// prefix a's stack with b's
export function prefixStackWith(a, b) {
  a.stack = b.stack + a.stack;
}

export function createErrorFromRPCError(
  c: RPCConfig,
  error: RPCError,
): CodedError {
  let err: CodedError;

  switch (error.type) {
    case 'EvalError':
      err = new EvalError(error.message);
      break;

    case 'RangeError':
      err = new RangeError(error.message);
      break;

    case 'ReferenceError':
      err = new ReferenceError(error.message);
      break;

    case 'SyntaxError':
      err = new SyntaxError(error.message);
      break;

    case 'TypeError':
      err = new TypeError(error.message);
      break;

    case 'URIError':
      err = new URIError(error.message);
      break;

    default:
      err = new Error(error.message);
      break;
  }

  prefixStackWith(err, error);

  if (error.code) {
    err.code = error.code;
  }

  return err;
}
