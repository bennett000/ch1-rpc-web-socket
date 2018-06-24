/**
 * Event functions
 */
import { createRPCError } from './rpc-error';

import { RPCConfig, RPCEvent, RPCPayload } from './interfaces';

/**
 * create an event object
 */
export function createEvent(
  type: number,
  payload: RPCPayload,
  givenUid: string,
): RPCEvent {
  return {
    payload,
    type,
    uid: givenUid,
  };
}

/**
 * create an error event object
 */
export function createErrorEvent(
  c: RPCConfig,
  type: number,
  error: Error,
  id?: string,
): RPCEvent {
  return createEvent(type, { error: createRPCError(c, error) }, id);
}
