/**
 * Functions for executing remote procedures and returning their results
 */
import { createEvent } from './events';

import {
  ConfiguredRPCEmit,
  RPCAsync,
  RPCAsyncContainerDictionary,
  RPCConfig,
  RPCAsyncType,
  RPCEventType,
} from './interfaces';

import { defer, rangeError, throwIfNotDefer } from './utils';

export function validateRegistration<T>(
  callbacks: RPCAsyncContainerDictionary,
  asyncFn: RPCAsync<T>,
  type: number,
  uid: string,
) {
  if (callbacks[uid]) {
    rangeError('Remote Procedure: async uid already exists!');
  }

  switch (type) {
    case RPCAsyncType.promise:
      throwIfNotDefer(asyncFn);
      break;

    // case 'nodeCallback':
    //   throwIfNotFunction(asyncFn);
    //   break;

    // case 'nodeEvent':
    //   throwIfNotFunction(asyncFn);
    //   break;
  }
}

export function registerAsync<T>(
  callbacks: RPCAsyncContainerDictionary,
  callback: RPCAsync<T>,
  type: number,
  uid: string,
) {
  validateRegistration(callbacks, callback, type, uid);

  callbacks[uid] = {
    async: callback,
    type,
  };
}

export function doPost(
  uid: () => string,
  postMethod,
  type: number,
  remoteFunction: string,
  args: any[],
) {
  const event = createEvent(
    type,
    {
      args,
      fn: remoteFunction,
    },
    uid(),
  );

  postMethod(event);

  return event;
}

// export function callbackRemote(
//   callbacks: RPCAsyncContainerDictionary,
//   postMethod: ConfiguredRPCEmit,
//   type: RPCAsyncType,
//   remoteFunction: string,
//   args,
// ) {
//   if (args.length === 0) {
//     typeError('RPC: Invalid Invocation: Callback required!');
//   }

//   const cb = args.pop();
//   const event = doPost(postMethod, type, remoteFunction, args);

//   registerAsync(callbacks, cb, type, event.uid);
// }

export function promiseRemote(
  uid: () => string,
  callbacks: RPCAsyncContainerDictionary,
  postMethod: ConfiguredRPCEmit,
  eventType: number,
  asyncType: number,
  remoteFunction: string,
  args,
) {
  const d = defer();
  const event = doPost(uid, postMethod, eventType, remoteFunction, args);

  registerAsync(callbacks, d, asyncType, event.uid);

  return d.promise;
}

export function create(
  c: RPCConfig,
  callbacks: RPCAsyncContainerDictionary,
  fullFnName: string,
  fnType?: number,
) {
  switch (fnType) {
    case RPCAsyncType.promise:
      return (...args) =>
        promiseRemote(
          c.uid,
          callbacks,
          c.emit,
          RPCEventType.promise,
          RPCAsyncType.promise,
          fullFnName,
          args,
        );

    // case 'nodeCallback':
    //   return (...args) =>
    //     callbackRemote(callbacks, c.emit, 'nodeCallback', fullFnName, args);

    // case 'nodeEvent':
    //   return (...args) =>
    //     callbackRemote(callbacks, c.emit, 'nodeEvent', fullFnName, args);

    default:
      if (fnType) {
        throw new Error(
          'remote-procedure: Unsupported function type ' + fnType,
        );
      }
      console.log('return default');
      return create(c, callbacks, fullFnName, c.defaultAsyncType);
  }
}
