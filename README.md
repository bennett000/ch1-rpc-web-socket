# CH1 RPC

[![CircleCI](https://circleci.com/gh/bennett000/ch1-rpc-web-socket.svg?style=svg)](https://circleci.com/gh/bennett000/ch1-rpc-web-socket)

_This is not well maintained_

_This is not traditional RPC, but it is like it_

## Installation

`yarn add @ch1/rpc-worker`

### Dependencies

This library has an external run time dependency for the server side portion,
which leverages the [excellent ws](https://github.com/websockets/ws 'Node WebSocket Library') library.

## Usage

_Warning, no error handling is implemented on the sockets yet, that will come in the next release_

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

## License

[LGPL](./LICENSE 'Lesser GNU Public License')
