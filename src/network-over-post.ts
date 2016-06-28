/**
 * Network over post establishes a network between two processes
 */
import { safeCall } from './remote';
import { createErrorFromRPCError } from './rpc-error';
import { createEvent, createErrorEvent } from './events';

import { 
  defer,
  isDefer,
  isFunction, 
  throwIfNotRPCEvent 
} from './utils';

import { 
  isRPCEvent, 
  isRPCErrorPayload, 
  isRPCReturnPayload,
  isRPCInvocationPayload,
  rangeError,
  typeError, 
  uid 
} from './utils';

import { 
  Dictionary,
  RemoteDesc,
  RPCAsync,
  RPCConfig, 
  RPCEvent,
  RPCErrorPayload,
  RPCInvocationPayload,
  RPCPayload,
  RPCReturnPayload,
} from './interfaces';

const invokeReturn = (
  c: RPCConfig, payload: RPCPayload, uid: string,
  callbacks: Dictionary<RPCAsync<any>>
) => returnPayload(c, payload, callbacks, uid);

const promiseReturn = invokeReturn;
const nodeCallbackReturn = invokeReturn;


const responders = Object.freeze({
  ack,
  create: createRemote,
  createReturn: createRemoteReturn,
  invoke,
  invokeReturn,
  on: onRemote,
  onReturn: onRemoteReturn,
  off: offRemote,
  offReturn: offRemoteReturn,
  nodeCallback,
  nodeCallbackReturn,
  promise,
  promiseReturn,
  ready,
  readyReturn,
});

export function create(config: RPCConfig, remoteDesc: RemoteDesc) {
  const id = uid();
  const callbacks = Object.create(null);

  const initState = createInitializationState(config, remoteDesc, id);

  return initialize(config, initState)
    .then(() =>  on(sendAck, config, callbacks, id));
}

export function createInitializationState(config: RPCConfig,
                                          remoteDesc: RemoteDesc, 
                                          id: string) {
  const d = defer();
  const readTimeout = setTimeout(() =>
      d.reject(new Error('RPC initialization failed, maximum delay of ' +
        `${config.defaultCreateWait}ms exceeded`)),
    config.defaultCreateWait);
  
  let delay = config.defaultCreateRetry;
  
  let createTimeout = setTimeout(fireCreate, delay);

  function fireCreate() {
    config.cemit(createEvent('create', { result: [ remoteDesc ] }));
    delay *= config.defaultCreateRetryCurve;
    createTimeout = setTimeout(fireCreate, delay);
  }
  
  function clean() {
    clearTimeout(readTimeout);
    stopCreateSpam();
  }
  
  function stopCreateSpam() {
    clearTimeout(createTimeout);
  }
  
  return {
    clean,
    defer: d,
    id,
    isCreated: false,
    hasCreated: false,
    localRemoteDesc: null,
    stopCreateSpam,
  };
}

export function initialize(config: RPCConfig, initState) {
  const off = config.on(config.message, (event: RPCEvent) => {
    const { payload } = event;
    
    if (isRPCErrorPayload(payload)) {
      throw createErrorFromRPCError(config, payload.error);
    }

    if (!isRPCReturnPayload(payload)) {
      rangeError('unexpected payload received during initialization');
    }

    if (event.type === 'create') {
      // create local remote
      initState.localRemoteDesc = payload.result[0];
      initState.hasCreated = true;
      config.cemit(createEvent('createReturn', { result: [ initState.id ] }));
    } else if (event.type === 'createReturn') {
      initState.stopCreateSpam();
      initState.isCreated = true;
    } else {
      rangeError('unexpected event received during initialization: ' +
        event.type);
    }

    if (initState.isCreated && initState.hasCreated) {
      initState.clean();
      off();
      initState.defer.resolve(initState.localRemoteDesc);
    }
  });
  
  return initState.defer.promise;
}

export function createRemote() {
  
}

export function createRemoteReturn() {
  
}

export function ack(c: RPCConfig, event: RPCEvent) {
  if (!c.useAcks) {
    typeError('ack even received but useAcks is disabled');
  }  
  
  const payload = event.payload;
  
  if (isRPCReturnPayload(payload)) {
    const uid = payload.result;
    
    if (!c.useAcks[uid]) {
      typeError(`ack expecting to find ack timeout for: ${uid}`);
    }
    
    clearTimeout(c.useAcks[uid]);
    delete c.useAcks[uid];
  } else {
    typeError('ack received invalid payload');
  }
}

export function ready() {
  
}

export function readyReturn() {
  
}

export function sendAck(c: RPCConfig, uid: string) {
  c.cemit(createEvent('ack', {result: [uid]}));
}

export function invoke(
  c: RPCConfig, payload: RPCInvocationPayload, uid: string) {
  const result = safeCall(c, payload.fn, payload.args);

  if (result instanceof Error) {
    c.cemit(createErrorEvent(c, 'invokeReturn', result));
    return;
  }

  c.cemit(createEvent('invokeReturn', { result: [ result ] }, uid));
}

export function fireError(c, payload: RPCErrorPayload, asyncReturn: RPCAsync) {
  const error = createErrorFromRPCError(c, payload.error);

  if (isDefer(asyncReturn)) {
    asyncReturn.reject(error);
    return;
  }
  
  if (isFunction(asyncReturn)) {
    asyncReturn(error);
    return;
  }
  
  throw error;
}

export function fireSuccess(
  c, payload: RPCReturnPayload, asyncReturn: RPCAsync) {
  
  if (isDefer(asyncReturn)) {
    asyncReturn.resolve.apply(asyncReturn.resolve, payload.result);
    return;
  }
  
  if (isFunction(asyncReturn)) {
    asyncReturn.apply(null, [null].concat(payload.result));
    return;
  }
  
  rangeError('fireSuccess: no async handler');
}

export function returnPayload(c: RPCConfig, 
                              payload: RPCPayload,
                              callbacks: Dictionary<RPCAsync<any>>, 
                              uid: string) {
  if (!callbacks[uid]) {
    rangeError(`invokeReturn: no matching callback for ${uid}`);
  }
  
  if (isRPCErrorPayload(payload)) {
    fireError(c, payload, callbacks[uid]);
    delete callbacks[uid];
    return;
  } else if (isRPCReturnPayload(payload)) {
    fireSuccess(c, payload, callbacks[uid]);
    delete callbacks[uid];
    return;
  }

  typeError('returnPayload: unexpected payload');
}

function onRemote(c: RPCConfig, payload: RPCPayload, uid: string,
                  callbacks: Object) {

  // const result = safeCall(c, payload.fn, payload.args);
  //
  // if (result instanceof Error) {
  //   c.cemit(createErrorEvent(c, 'onReturn', result));
  //   return;
  // }
  //
  // if (callbacks[uid]) {
  //   c.cemit(createErrorEvent(c, 'onReturn', new Error('invokeReturn: ' + '' +
  //     `callback with uid: ${uid} already registered`)));
  //   return;
  // }
  //
  // const onReturn = () => {
  //   cemit(createEvent(c, 'onReturn', {}));
  // };
  //
  // callbacks[uid] = onReturn;
}

function onRemoteReturn(c: RPCConfig, payload: RPCPayload, uid: string,
                        callbacks: Object, id: string) {

}

function offRemote(c: RPCConfig, payload: RPCPayload, uid: string,
                   callbacks: Object, id: string) {

}

function offRemoteReturn(c: RPCConfig, payload: RPCPayload, uid: string,
                         callbacks: Object, id: string) {

}

function nodeCallback(c: RPCConfig, payload: RPCPayload, uid: string,
                      callbacks: Object, id: string) {

}

function promise(c: RPCConfig, payload: RPCPayload, uid: string,
                 callbacks: Object, id: string) {

}

export function on(sendAck: (c: RPCConfig, uid: string) => void, 
  c: RPCConfig, callbacks: Dictionary<RPCAsync<any>>, id: string) {

  return c.on(c.message, (event) => {
      throwIfNotRPCEvent(event, 
        `expecting an RPCEvent: Received: ${typeof event}`);

    responders[event.type](c, event.payload, event.uid, callbacks, id);
    
    if (event.useAcks && event.type !== 'ack') {
      sendAck(c, event.uid);
    }
  });
}

