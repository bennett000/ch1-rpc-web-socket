/**
 * Project interfaces
 */

/**
 * Generic Dictionary
 */
export interface Dictionary<T> {
  [key: string]: T;
}

/**
 * Where `T` is the type of the complete interface you wish to expose
 */
export interface Remote<T> extends Dictionary<Function | Object> {}

/**
 * Specify async types on the remote
 */
export interface RemoteDesc extends Dictionary<number | Dictionary<number>> {}

/**
 * Async style function union
 */
export type RPCAsync<T> =
  | RPCDefer<T>
  | RPCNodeCallback<T>
  | RPCNodeEventInternal
  | RPCNotify<T>;

/**
 * Ensures correct async response
 */
export interface RPCAsyncContainer<T> {
  type: number;
  async: RPCAsync<T> | Dictionary<RPCNodeEventInternal>;
}

export interface RPCNodeEventInternal {
  listener: Function;
  uid: string;
}

export type RPCAsyncContainerDictionary = Dictionary<RPCAsyncContainer<any>>;

export interface RPCNodeCallback<T> {
  (error: Error, param?: T);
  (error: Error, ...rest: any[]);
}

/**
 * tl;dr these are used in `RemoteDesc` to describe given API functions
 *
 * js-rpc uses these strings to identify types of "real world" functions that
 * it can interface with.
 *
 * These types are actually used by consumers of the library since they are the
 * specific strings enforced by `RemoteDesc`
 *
 * - ### "nodeCallback"
 * nodeCallback refers to JavaScript callback functions that strictly follow
 * two rules:
 *
 *     - the _last_ parameter passed to a function is the callback
 *     - a "Nullable Error" is the _first_ parameter passed to the callback
 *
 *     Example:
 *
 *     ```js
 *     function add(a, b, callback) {
 *       setTimeout(() => {
 *         if (isNumber(a) && (isNumber(b)) {
 *           callback(null, result);
 *         } else {
 *           callback(new TypeError('add is for numbers'));
 *         }
 *       }, 0);
 *     }
 *
 *     add(1, 2, (err, result) => expect(result).toBe(3);
 *     add(1, 2, (err, result) => expect(error).toBeFalsey();
 *     add('1', 2), (erro, result) => expect(error instanceof Error).toBe(true);
 *     ```
 *
 * - ### "nodeEvent"/"nodeEventInternal"
 * nodeEvents are a _limited_ interface to *
 * [node EventEmitters](https://nodejs.org/api/events.html "docs")
 *
 * - ### "observable"
 * In this case observables refer to
 * [RxJS5](https://github.com/ReactiveX/rxjs, "RxJS")
 *
 * - ### "promise"
 * promises are es6 promises or any A+ promises that implement `.then` and
 * `.catch` along with the global `Promise`
 */
// export type RPCAsyncType =
//   | 'nodeCallback'
//   | 'nodeEvent'
//   | 'nodeEventInternal'
//   | 'observable'
//   | 'promise';

export const RPCAsyncType = {
  observable: 100,
  promise: 200,
};

export interface RPCDefer<T> {
  resolve: (any) => any;
  reject: (any) => any;
  promise: Promise<T>;
}

/**
 * The Different Types of RPC Events
 */
// export type RPCEventType =
//   | 'ack'
//   | 'addEventListener'
//   | 'create'
//   | 'createReturn'
//   | 'destroy'
//   | 'destroyReturn'
//   | 'fnReturn'
//   | 'invoke'
//   | 'nodeCallback'
//   | 'nodeOn'
//   | 'nodeRemoveListener'
//   | 'browserRemoveListener'
//   | 'observe'
//   | 'promise'
//   | 'subscribe'
//   | 'subscribeReturn'
//   | 'unSubscribeReturn';

export const RPCEventType = Object.freeze({
  ack: 1,
  create: 2,
  createReturn: 3,
  destroy: 4,
  destroyReturn: 5,
  fnReturn: 6,
  invoke: 7,
  promise: 9,
  subscribe: 10,
  unsubscribe: 11,
});

export interface RPCEmit {
  (message: string, payload: RPCEvent): any;
}

export interface ConfiguredRPCEmit {
  (payload: RPCEvent): any;
}

export interface RPCNotify<T> {
  (param: T, ...args: any[]);
  (...args: any[]);
}

export interface RPCObservable<T> {
  subscribe: (
    next: (param: T) => any,
    onError: (error: Error) => any,
    onComplete: () => any,
  ) => () => void;
}

export interface RPCOn {
  (message: string, callback: (payload: RPCEvent) => void): () => void;
}

export interface ConfiguredRPCOn {
  (callback: (payload: RPCEvent) => any): () => any;
}

export interface RPCOptions {
  defaultAsyncType?: number;
  defaultCreateRetry?: number;
  defaultCreateRetryCurve?: number;
  defaultCreateWait?: number;
  enableStackTrace?: boolean;
  maxAckDelay?: number;
  useAcks?: Dictionary<number>;
}

export interface FunctionalState {
  responders: RPCEventRegistry;
  successHandlers: RPCEventRegistry;
  errorHandlers: RPCEventRegistry;
}
export interface RPCAbstractConfig extends RPCOptions {
  message?: string;
  remote?: Object;
  emit?: ConfiguredRPCEmit;
  on?: ConfiguredRPCOn;
  functionalState?: FunctionalState;
  uid?: () => string;
}

export interface RPCConfig extends RPCAbstractConfig {
  emit: ConfiguredRPCEmit;
  on: ConfiguredRPCOn;
}

export type RPCEventRegistry = {
  [key: number]: (...args: any[]) => any;
};
export type RPCAsyncRegistry = {
  [key: number]: (...args: any[]) => any;
};

export type RPCRegister = (
  key: number,
  value: (...args: any[]) => any,
) => void;
/**
 * JavaScript error with a code number
 */
export interface CodedError extends Error {
  code?: number;
  stack?: string;
}

/**
 * Serializable Error
 */
export interface RPCError {
  code?: number;
  message: string;
  stack?: string;
  type?: string;
}

export interface RPCInvocationPayload {
  fn: string;
  args: any[];
}

export interface RPCErrorPayload {
  error: RPCError;
}

export interface RPCReturnPayload {
  result: any[];
}

export type RPCPayload =
  | RPCInvocationPayload
  | RPCReturnPayload
  | RPCErrorPayload;

export interface RPCEvent {
  type: number;
  payload: RPCPayload;
  uid: string;
  useAcks?: boolean;
}

export interface RPC<T> {
  config: RPCConfig;
  destroy: () => Promise<void>;
  ready: Promise<void>;
  remote: T;
}
