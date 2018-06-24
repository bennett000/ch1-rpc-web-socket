/**
 * Project wide constants
 */
import { RPCAsyncType } from './interfaces';

/**
 * Dfault type of async function
 */
export const DEFAULT_ASYNC_TYPE: number = RPCAsyncType.promise;

/**
 * Default message used across postMessage
 */
export const DEFAULT_MESSAGE = 'js-rpc-message';

/**
 * ms to wait before retrying *first* create signal
 */
export const DEFAULT_CREATE_RETRY = 10;

/**
 * multiplier used to "curve" `DEFAULT_CREATE_RETRY`
 */
export const DEFAULT_CREATE_RETRY_CURVE = 1.2;

/**
 * ms to wait before giving up on create exchange
 */
export const DEFAULT_CREATE_WAIT = 30000;

/**
 * ms to wait before timeout on acks, if useAcks is one
 */
export const DEFAULT_TIMEOUT_ACK = 5000;
