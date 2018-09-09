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

export type NativeWebSocket = {
  addEventListener: (
    message: string,
    handler: (result: { data: any }) => any,
  ) => any;
  send: (data: string) => any;
};

export type WsWebSocket = {
  on: (message: string, callback: (data: any) => any) => any;
  send: (data: string) => any;
};

/**
 * Socket RPC Config
 */
export interface RPCSocketConfig extends RPCAbstractConfig {
  pingDelay?: number;
  socket: NativeWebSocket | WsWebSocket;
}

function configureNativeSocketOnMethod(config: any) {
  config.on = (callback: (data: any) => any) => {
    const handler = (data: any) => {
      callback(JSON.parse(data.data));
    };
    config.socket.addEventListener('message', handler);

    return () => config.socket.removeEventListener('message', handler);
  };
}

function configureWsSocketOnMethod(config: any) {
  config.on = (callback: (data: any) => any) => {
    const handler = (data: any) => {
      callback(JSON.parse(data));
    };
    config.socket.on('message', handler);

    return () => config.socket.removeEventListener('message', handler);
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
    configureNativeSocketOnMethod(config);
  } else {
    configureWsSocketOnMethod(config);
  }

  if (typeof config.socket.send !== 'function') {
    throw new TypeError('rpc-web-socket: socket must have a send method');
  }

  config.emit = (data: any) => {
    config.socket.send(JSON.stringify(data));
  };
}

function configureNativeSocket<RemoteConfig>(
  config: any,
  remote: Remote<any>,
  remoteDesc: RemoteDesc,
) {
  let resolve;
  let reject;
  let rpc;
  const earlyDestroys = [];
  const expose = {
    onDestroy: (...args: any[]) => {
      let destroyed = false;
      const destroy = (reason?: string) => {
        destroyed = true;
        desc.onDestroy(reason);
      };

      const desc = {
        isValid: () => {
          if (destroyed) {
            return false;
          } else {
            return true;
          }
        },
        args,
        onDestroy: reason => {},
      };

      earlyDestroys.push(desc);

      return destroy;
    },
    ready: new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }),
  };
  // @todo awkard... this will need a refactor
  (config.socket as any).addEventListener('close', () => {
    if (rpc) {
      rpc.destroy('rpc: web-socket closed');
    } else {
      console.warn('rpc: web-socket error: rpc still not defined (close)');
    }
  });
  // @todo awkard... this will need a refactor
  (config.socket as any).addEventListener('error', error => {
    if (rpc) {
      rpc.destroy('rpc: web-socket error: native: ' + error.message);
    } else {
      console.warn('rpc: web-socket error: rpc still not defined (error)');
    }
  });
  (config.socket as any).addEventListener('open', () => {
    rpc = createRemote<RemoteConfig>(<RPCConfig>config, remote, remoteDesc);
    earlyDestroys.forEach(desc => {
      if (desc.isValid()) {
        desc.onDestroy = rpc.onDestroy(...desc.args);
      }
    });
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
}

function configureWsSocket<RemoteConfig>(
  config: any,
  remote: Remote<any>,
  remoteDesc: RemoteDesc,
) {
  const rpc = createRemote<RemoteConfig>(
    <RPCConfig>config,
    remote,
    remoteDesc,
  );
  const interval = setInterval(() => {
    if (config.socket.isAlive === false) {
      config.socket.terminate();
    }
    config.socket.isAlive = false;
    config.socket.ping();
  }, config.pingDelay || 10000);

  config.socket.isAlive = true;
  config.socket.on('pong', () => (config.socket.isAlive = true));

  const destroy = rpc.destroy;

  rpc.destroy = () => {
    clearInterval(interval);
    return destroy();
  };

  return rpc;
}

export function create<RemoteType>(
  config: RPCSocketConfig,
  remote?: Remote<any>,
  remoteDesc?: RemoteDesc,
) {
  configureOnEmit(config);

  if (typeof WebSocket !== 'undefined') {
    return configureNativeSocket<RemoteType>(config, remote, remoteDesc);
  } else {
    return configureWsSocket<RemoteType>(config, remote, remoteDesc);
  }
}
