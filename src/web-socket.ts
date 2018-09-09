/**
 * This module uses `JSON.stringify` and `JSON.parse` for a number of reasons:
 *
 *  - I'm too lazy to figure out an efficient `ArrayBuffer` approach, that said
 *  I can imagine it easy to make a hybrid...
 *  - Historically the library used them out of paranoia and sloth (detecting
 *  browser object clone support)
 *  - Because apparently `JSON` is actually reasonable:
 *  https://nolanlawson.com/2016/02/29/high-performance-web-worker-messages/
 */

import {
  create as createRemote,
  Remote,
  RemoteDesc,
  RPCAbstractConfig,
  RPCConfig,
} from '@ch1/rpc';

export type WebSocketType = {
  on: (message: string, callback: (data: string) => void) => void;
  send: (data: string) => void;
};

/**
 * Socket RPC Config
 */
export interface RPCSocketConfig extends RPCAbstractConfig {
  socket?:
    | WebSocketType
    | {
        addEventListener: (
          message: string,
          callback: (data: any) => void,
        ) => void;
        send: (data: any) => void;
      };
}

function configureOnEmit(config: any) {
  if (!config.socket) {
    throw new TypeError('rpc-web-socket: socket interface required');
  }

  if (typeof config.socket.on !== 'function') {
    if (typeof config.socket.addEventListener !== 'function') {
      throw new TypeError('rpc-web-socket: socket must have an on method');
    }
    config.on = (callback: (data: any) => any) => {
      const handler = (data: any) => {
        callback(JSON.parse(data.data));
      };
      config.socket.addEventListener('message', handler);

      return () => config.socket.removeEventListener('message', handler);
    };
  } else {
    config.on = (callback: (data: any) => any) => {
      const handler = (data: any) => {
        callback(JSON.parse(data));
      };
      config.socket.on('message', handler);

      return () => config.socket.removeEventListener('message', handler);
    };
  }

  if (typeof config.socket.send !== 'function') {
    throw new TypeError('rpc-web-socket: socket must have a send method');
  }

  config.emit = (data: any) => {
    config.socket.send(JSON.stringify(data));
  };
}

export function create<T>(
  config: RPCSocketConfig = {},
  remote?: Remote<any>,
  remoteDesc?: RemoteDesc,
) {
  configureOnEmit(config);

  if (typeof WebSocket !== 'undefined') {
    let resolve;
    let reject;
    const expose = {
      ready: new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      }),
    };
    (config.socket as any).addEventListener('open', () => {
      const rpc = createRemote<T>(<RPCConfig>config, remote, remoteDesc);
      rpc.ready
        .then(() => {
          Object.keys(rpc).forEach(key => {
            expose[key] = rpc[key];
          });
          resolve();
        })
        .catch(reject);
    });
    return expose;
  } else {
    return createRemote<T>(<RPCConfig>config, remote, remoteDesc);
  }
}
