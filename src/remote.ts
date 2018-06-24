/**
 * Functions related to creating and using remote objects
 */
import * as rpc from './remote-procedure';

import {
  Remote,
  RemoteDesc,
  RPCAsyncContainerDictionary,
  RPCConfig,
} from './interfaces';

import {
  createTypeError,
  isFunction,
  isDictionary,
  isObject,
  isRPCDefaultAsync,
  safeInvoke,
} from './utils';

export function getFinalFunction(remote: Object, fnName: string) {
  const names = fnName.split('.').filter(Boolean);

  // invalid function name case
  if (names.length === 0) {
    return createTypeError(`getFinalFunction: ${fnName} not found on remote`);
  }

  // "first level" case
  if (names.length === 1) {
    if (isFunction(remote[names[0]])) {
      return remote[names[0]];
    }
    return createTypeError(
      `getFinalFunction: ${fnName} is not a function: ` +
        typeof remote[names[0]],
    );
  }

  // invalid sub object case
  if (!remote[names[0]]) {
    return createTypeError(
      `getFinalFunction: ${names[0]} is not a ` +
        'namespace (sub-object) on remote',
    );
  }

  // sub object case
  if (names.length === 2) {
    return getFinalFunction(remote[names[0]], names[1]);
  }

  // deeper object case
  return getFinalFunction(remote[names.shift()], names.join('.'));
}

/**
 * Safely finds and executes a proxy for a remote procedure
 */
export function safeCall(c: RPCConfig, fnName: string, args?: any[]) {
  const fn = getFinalFunction(c.remote, fnName);

  if (!Array.isArray(args)) {
    args = [];
  }

  if (fn instanceof Error) {
    return fn;
  }

  return safeInvoke(fn, args);
}

export function create<T>(
  c: RPCConfig,
  callbacks: RPCAsyncContainerDictionary,
  remoteDesc: RemoteDesc,
  remote?: T,
  prefix?: string,
): T {
  remoteDesc = remoteDesc || Object.create(null);

  remote = remote || Object.create(null);

  return <T>Object.keys(remoteDesc).reduce((state, prop) => {
    const desc = remoteDesc[prop];
    prefix = prefix || '';

    if (isDictionary(desc)) {
      state[prop] = create(c, callbacks, desc, remote[prop], prop + '.');
    } else if (isRPCDefaultAsync(desc)) {
      state[prop] = rpc.create(c, callbacks, prefix + prop, desc);
    }

    return state;
  }, remote);
}

export function createRemoteDescFrom(
  c: RPCConfig,
  remote: Remote<any>,
  remoteDesc?: RemoteDesc,
) {
  remote = remote || Object.create(null);
  remoteDesc = remoteDesc || Object.create(null);

  const newRemoteDesc = Object.create(null);

  /* tslint:disable forin */
  for (let prop in remote) {
    if (isObject(remote[prop])) {
      let newDesc;
      if (isDictionary<RemoteDesc>(remoteDesc[prop])) {
        newDesc = remoteDesc[prop];
      } else {
        newDesc = Object.create(null);
      }
      newRemoteDesc[prop] = createRemoteDescFrom(
        c,
        <Remote<any>>remote[prop],
        newDesc,
      );
    }
    if (isFunction(remote[prop])) {
      const type = remoteDesc[prop] || c.defaultAsyncType;
      newRemoteDesc[prop] = type;
    }
  }

  return newRemoteDesc;
}
