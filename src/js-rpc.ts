/**
 * Main module "really ties the project together"
 */
import { isObject, pnoop, typeError, throwIfNotFunction } from './utils';
import { create as createRemote, createRemoteDescFrom } from './remote';
import * as nOp from './response';

import {
  Remote,
  RemoteDesc,
  RPC,
  RPCAsyncContainerDictionary,
  RPCConfig,
} from './interfaces';

import {
  DEFAULT_ASYNC_TYPE,
  DEFAULT_MESSAGE,
  DEFAULT_CREATE_RETRY,
  DEFAULT_CREATE_RETRY_CURVE,
  DEFAULT_CREATE_WAIT,
} from './constants';
import { createUidGenerator } from './utils';

/**
 * Where `RemoteType` is the description of the interface you _expect_ to be
 * exposed *by the "other side"*
 * @param config
 * @param remote optional remote to expose *on the "other side"*
 */
export function create<RemoteType>(
  config: RPCConfig,
  remote?: Remote<any>,
  remoteDesc?: RemoteDesc,
): RPC<RemoteType> {
  remote = validateRemote(remote);
  config = validateConfig(config, remote);

  const local: RemoteType = Object.create(null);
  const callbacks: RPCAsyncContainerDictionary = Object.create(null);
  const combinedDesc = createRemoteDescFrom(config, remote, remoteDesc);
  let destroy: () => Promise<void> = pnoop;

  const isReady = nOp
    .create(config, callbacks, combinedDesc)
    .then(network => {
      createRemote<RemoteType>(config, callbacks, network.remoteDesc, local);
      destroy = network.off;
    });

  return <RPC<RemoteType>>{
    config,
    destroy: () => {
      Object.keys(local).forEach(key => delete local[key]);
      Object.keys(callbacks).forEach(key => delete callbacks[key]);
      return destroy().then(() => {
        destroy = pnoop;
      });
    },
    ready: isReady,
    remote: local,
  };
}

export function validateRemote(r: Object): Remote<any> {
  r = r || Object.create(null);

  if (!isObject(r)) {
    typeError('validateRemote: remote must be an object');
  }

  return <Remote<any>>r;
}

export function validateConfig(c: RPCConfig, remote: Remote<any>): RPCConfig {
  throwIfNotFunction(c.on, 'validateConfig: config requires an on method');
  throwIfNotFunction(
    c.emit,
    'validateConfig: config requires an emit method',
  );

  c.defaultAsyncType = c.defaultAsyncType || DEFAULT_ASYNC_TYPE;
  c.defaultCreateRetry = c.defaultCreateRetry || DEFAULT_CREATE_RETRY;
  c.defaultCreateRetryCurve =
    c.defaultCreateRetryCurve || DEFAULT_CREATE_RETRY_CURVE;
  c.defaultCreateWait = c.defaultCreateWait || DEFAULT_CREATE_WAIT;
  c.enableStackTrace = c.enableStackTrace || false;
  c.functionalState = nOp.createFunctionalState();
  c.maxAckDelay = c.maxAckDelay || 5000;
  c.message = c.message || DEFAULT_MESSAGE;

  c.uid = createUidGenerator();

  c.useAcks = c.useAcks ? Object.create(null) : null;
  c.remote = remote;

  return Object.freeze(c);
}

export function extend() {}
