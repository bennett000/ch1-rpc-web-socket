/**
 * Low level functions that respond to remote procedure calls:
 */
import { safeCall } from './remote';
import { createErrorFromRPCError } from './rpc-error';
import { createEvent, createErrorEvent } from './events';

import {
  defer,
  isDefer,
  isRPCErrorPayload,
  isRPCInvocationPayload,
  isRPCReturnPayload,
  rangeError,
  throwIfNotRPCEvent,
  typeError,
} from './utils';

import {
  FunctionalState,
  RemoteDesc,
  RPCAsyncContainer,
  RPCAsyncContainerDictionary,
  RPCConfig,
  RPCEvent,
  RPCErrorPayload,
  RPCPayload,
  RPCReturnPayload,
  RPCEventType,
  RPCAsyncType,
  RPCEventRegistry,
  RPCRegister,
  RPCAsyncRegistry,
} from './interfaces';

const fnReturn = (
  c: RPCConfig,
  payload: RPCPayload,
  id: string,
  callbacks: RPCAsyncContainerDictionary,
) => returnPayload(c, payload, callbacks, id);

export function createFunctionalState(): FunctionalState {
  return {
    responders: {
      // [RPCEventType.ack]: nodeOn,
      // [RPCEventType.ack]: nodeRemoveListener,
      // [RPCEventType.ack]: nodeCallback,
    },
    successHandlers: {},
    errorHandlers: {},
  };
}

function register(
  dictionary: RPCEventRegistry | RPCAsyncRegistry,
  key: number,
  value: (...args: any[]) => any,
) {
  if (dictionary[key]) {
    return;
  }
  dictionary[key] = value;
}

export function create(
  config: RPCConfig,
  callbacks,
  remoteDesc: RemoteDesc,
): Promise<{ off: () => Promise<void>; remoteDesc: RemoteDesc }> {
  bootstrap(config.functionalState);
  const id = config.uid();

  const initState = createInitializationState(config, remoteDesc, id);

  return initialize(config, initState).then(localRemoteDesc => {
    const off = on(sendAck, config, callbacks, id);
    /** @todo implement RPC destroy here */

    return {
      off: () => new Promise<void>(resolve => resolve(off())),
      remoteDesc: localRemoteDesc,
    };
  });
}

export function createInitializationState(
  config: RPCConfig,
  remoteDesc: RemoteDesc,
  id: string,
) {
  const d = defer();
  const readTimeout = setTimeout(
    () =>
      d.reject(
        new Error(
          'RPC initialization failed, maximum delay of ' +
            `${config.defaultCreateWait}ms exceeded`,
        ),
      ),
    config.defaultCreateWait,
  );

  let delay = config.defaultCreateRetry;

  let createTimeout = setTimeout(fireCreate, delay);

  function fireCreate() {
    config.emit(
      createEvent(
        RPCEventType.create,
        { result: [remoteDesc] },
        config.uid(),
      ),
    );
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

export function initialize(
  config: RPCConfig,
  initState,
): Promise<RemoteDesc> {
  const off = config.on((event: RPCEvent) => {
    const { payload } = event;

    if (isRPCErrorPayload(payload)) {
      throw createErrorFromRPCError(config, payload.error);
    }

    if (!isRPCReturnPayload(payload)) {
      rangeError(
        'unexpected payload received during initialization ' +
          JSON.stringify(event),
      );
    }

    if (isRPCReturnPayload(payload)) {
      if (event.type === RPCEventType.create) {
        if (initState.hasCreated) {
          return;
        }
        // create local remote
        initState.localRemoteDesc = payload.result[0];
        initState.hasCreated = true;
        config.emit(
          createEvent(
            RPCEventType.createReturn,
            { result: [initState.id] },
            config.uid(),
          ),
        );
      } else if (event.type === RPCEventType.createReturn) {
        if (initState.isCreated) {
          return;
        }
        initState.stopCreateSpam();
        initState.isCreated = true;
      } else {
        rangeError(
          'unexpected event received during initialization: ' + event.type,
        );
      }
    }

    if (initState.isCreated && initState.hasCreated) {
      initState.clean();
      off();
      initState.defer.resolve(initState.localRemoteDesc);
    }
  });

  return initState.defer.promise;
}

export function ack(c: RPCConfig, event: RPCEvent) {
  if (!c.useAcks) {
    typeError('ack even received but useAcks is disabled');
  }

  const payload = event.payload;

  if (isRPCReturnPayload(payload)) {
    const id = payload.result[0];

    if (!c.useAcks[id]) {
      typeError(`ack expecting to find ack timeout for: ${id}`);
    }

    clearTimeout(c.useAcks[id]);
    delete c.useAcks[id];
  } else {
    typeError('ack received invalid payload');
  }
}

export function sendAck(c: RPCConfig, id: string) {
  c.emit(createEvent(RPCEventType.ack, { result: [id] }, c.uid()));
}

export function invoke(c: RPCConfig, payload: RPCPayload, id: string) {
  if (isRPCInvocationPayload(payload)) {
    const result = safeCall(c, payload.fn, payload.args);

    if (result instanceof Error) {
      c.emit(createErrorEvent(c, RPCEventType.fnReturn, result, id));
      return;
    }

    c.emit(createEvent(RPCEventType.fnReturn, { result: [result] }, id));
  } else {
    c.emit(
      createErrorEvent(
        c,
        RPCEventType.fnReturn,
        new TypeError('invoke: invalidPayload'),
        id,
      ),
    );
  }
}

export function fireError(
  c: RPCConfig,
  payload: RPCErrorPayload,
  asyncReturn: RPCAsyncContainer<any>,
) {
  const error = createErrorFromRPCError(c, payload.error);
  const asyncFn: any = asyncReturn.async;

  if (c.functionalState.errorHandlers[asyncReturn.type]) {
    c.functionalState.errorHandlers[asyncReturn.type](asyncFn, error);
  } else {
    throw error;
  }
}

export function fireSuccess(
  c,
  payload: RPCReturnPayload,
  asyncReturn: RPCAsyncContainer<any>,
) {
  const asyncFn = asyncReturn.async;

  if (c.functionalState.successHandlers[asyncReturn.type]) {
    c.functionalState.successHandlers[asyncReturn.type](
      asyncFn,
      payload.result,
    );
  } else {
    rangeError('fireSuccess: no async handler');
  }
}

export function returnPayload(
  c: RPCConfig,
  payload: RPCPayload,
  callbacks: RPCAsyncContainerDictionary,
  id: string,
) {
  if (!callbacks[id]) {
    rangeError(`invokeReturn: no matching callback for ${id}`);
  }

  if (isRPCErrorPayload(payload)) {
    fireError(c, payload, callbacks[id]);
    delete callbacks[id];
    return;
  } else if (isRPCReturnPayload(payload)) {
    fireSuccess(c, payload, callbacks[id]);
    delete callbacks[id];
    return;
  }

  typeError('returnPayload: unexpected payload for event: ' + event.type);
}

export function promise(c: RPCConfig, payload: RPCPayload, id: string) {
  if (isRPCInvocationPayload(payload)) {
    const result = safeCall(c, payload.fn, payload.args);

    if (result instanceof Error) {
      c.emit(createErrorEvent(c, RPCEventType.fnReturn, result, id));
      return;
    }

    result
      .then((...args) =>
        c.emit(createEvent(RPCEventType.fnReturn, { result: args }, id)),
      )
      .catch(err =>
        c.emit(createErrorEvent(c, RPCEventType.fnReturn, err, id)),
      );
  } else {
    c.emit(
      createErrorEvent(
        c,
        RPCEventType.fnReturn,
        new TypeError('promise: invalidPayload'),
        id,
      ),
    );
  }
}

function tryHandler(fn, args, event) {
  try {
    return fn.apply(null, args);
  } catch (err) {
    throw new Error(
      `RPC: No registered handler for event: ${event.type}: ` + err.message,
    );
  }
}

export function on(
  sendAckFn: (c: RPCConfig, id: string) => void,
  c: RPCConfig,
  callbacks: RPCAsyncContainerDictionary,
  id: string,
) {
  return c.on(event => {
    throwIfNotRPCEvent(
      event,
      `expecting an RPCEvent: Received: ${typeof event} `,
    );

    tryHandler(
      c.functionalState.responders[event.type],
      [c, event.payload, event.uid, callbacks, id],
      event,
    );

    if (event.useAcks && event.type !== RPCEventType.ack) {
      sendAckFn(c, event.uid);
    }
  });
}

export function bootstrap(functionalState: FunctionalState) {
  const registerResponder: RPCRegister = register.bind(
    null,
    functionalState.responders,
  );
  const registerSuccessHandler: RPCRegister = register.bind(
    null,
    functionalState.successHandlers,
  );
  const registerErrorHandler: RPCRegister = register.bind(
    null,
    functionalState.errorHandlers,
  );

  /** Bootstrap the inbuilt respoonders */
  registerResponder(RPCEventType.ack, ack);
  registerResponder(RPCEventType.invoke, invoke);
  registerResponder(RPCEventType.fnReturn, fnReturn);
  registerResponder(RPCEventType.promise, promise);

  registerErrorHandler(RPCAsyncType.promise, (asyncFn: any, error: any) => {
    if (isDefer<any>(asyncFn)) {
      asyncFn.reject(error);
    } else {
      throw new RangeError('registerErrorHandler: incorrect function type');
    }
  });

  // case 'nodeCallback':
  //   if (isRPCNodeCallback<any>(asyncFn)) {
  //     asyncFn(error);
  //     return;
  //   }
  //   break;

  registerSuccessHandler(
    RPCAsyncType.promise,
    (asyncFn: any, payload: any) => {
      if (isDefer(asyncFn)) {
        asyncFn.resolve.apply(asyncFn.resolve, payload);
      } else {
        throw new RangeError(
          'registerSuccessHandler: incorrect function type',
        );
      }
    },
  );
  // case 'nodeCallback':
  //   if (isRPCNodeCallback(asyncFn)) {
  //     asyncFn.apply(null, [null].concat(payload.result));
  //     return;
  //   }
  //   break;

  // case 'nodeEvent':
  //   if (isRPCNotify(asyncFn)) {
  //     asyncFn.apply(null, [null].concat(payload.result));
  //     return;
  //   }
  //   break;
  return functionalState;
}
