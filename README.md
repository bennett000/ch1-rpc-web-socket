# CH1 RPC

[![CircleCI](https://circleci.com/gh/bennett000/ch1-rpc-web-socket.svg?style=svg)](https://circleci.com/gh/bennett000/ch1-rpc-web-socket)

_This is not well maintained_

_This is not traditional RPC, but it is like it_

## Installation

`yarn add @ch1/rpc-web-socket`

### Dependencies

This library has an external _optional_ run time dependency for the server
side portion, which leverages the [excellent ws](https://github.com/websockets/ws 'Node WebSocket Library')
library.

The dependency is optional in that this library will work with anything that
satisfies the `ws` interface:

```ts
export type WsWebSocket = {
  on: (message: string, callback: (data: any) => any) => any;
  send: (data: string) => any;
};
```

We _do_ include `ws` as a `devDependency` since we use it for testing the
library end to end.

## Usage

Slightly easier API than in the raw [`@ch1/rpc`](https://github.com/bennett000/ch1-rpc 'CH1 RPC')

Client JS Script (using the function foo on the server)

```ts
const ws = new WebSocket('ws://localhost:8080');
const rpc = wrpc.create({ socket: ws });

rpc.ready.then(() => rpc.remote.foo()).then(result => {
  expect(result).toBe(7);
});
```

Server JS (sharing the function foo to the client)

```ts
const WebSocket = require('ws');
const wrpc = require('@ch1/rpc-web-socket');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  wrpc.create(
    { socket: ws },
    {
      foo: () => new Promise(resolve => resolve(7)),
    },
  );
});
```

### Error Handling

Due to the nature of state that could exist on client/server, this library
takes the approach of terminating itself in the event of catastrophic failure.

- Individual functions that fail are left up to the user to handle
- Connection failures will result in the destruction of the object
- Pending async requests will have their error handlers triggered

best practice is to add an error listener:

```ts
const wrpc = require('@ch1/rpc-web-socket');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  const rpc = wrpc.create(
    { socket: ws },
    {
      foo: () => new Promise(resolve => resolve(7)),
    },
  );

  // This is teh relevant bit
  rpc.onDestroy((reason?: string) => {
    // put your error handling logic here.
  });
});
```

#### Web Socket Connection Handling

This library attempts to automatically handle all connection errors and fail
fast where possible. This includes a server side "ping pong" to detect
"unplug" events.

_Reconnection Is Left Up To The User of The Library, `onDestroy` is
your friend_

Presumably the client will be responsible for the reconnection.

## API

The `create` function will provide an `RPC<RemoteType>` object:

```ts
export function create<RemoteType>(
  // required
  config: RPCSocketConfig,

  // functions (optionally nested) to provide to other side of the connection
  remote?: Remote<any>,

  // not used for now
  remoteDesc?: RemoteDesc,
) {
```

The `RPCSocketConfig` object looks like:

```ts
export interface RPCSocketConfig {
  // optionally configure the ping/pong delay the server uses
  // defaults to 10,000ms
  pingDelay?: number;

  // *mandatory* the socket to use, either WebSocket in the browser
  // or something _like_ `ws` on the server
  // (we're ws 6.x compatible)
  socket: NativeWebSocket | WsWebSocket;
}
```

The `RPC<RemoteType>` object is described [in the documentation for @ch1/rpc](https://www.npmjs.com/package/@ch1/rpc '@ch1/rpc documentation')

## License

[LGPL](./LICENSE 'Lesser GNU Public License')
