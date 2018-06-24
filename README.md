# CH1 RPC

[![CircleCI](https://circleci.com/gh/bennett000/ch1-rpc.svg?style=svg)](https://circleci.com/gh/bennett000/ch1-rpc)

_This is not well maintained_

_This is not traditional RPC, but it is like it_

_This library ships only es6 modules with \*.d.ts files, beware_

## Installation

`yarn add @ch1/rpc`

## Usage

Process A

```js
const b = rpc.create({ /* config */}, {
  sayOnA: (arg) => console.log(`Process B says ${arg}`);
});

remote.ready().then(() => b.remote.sayOnB('hello world');
// will call sayOnB on process B
```

Process B

```js
const a = rpc.create({ /* config */}, {
  sayOnB: (arg) => console.log(`Process A says ${arg}`);
});

remote.ready().then(() => a.remote.sayOnA('hello world');
// will call sayOnA on process A
```

## How It Works

@ch1/rpc can work across any transport provided that the transport can be
simplified into `on` and `emit` functions.

What do we mean by `on` and `emit` functions? Let's imagine for a moment the
[Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers 'MDN: Using Web Workers')

_note: @ch1/rpc-worker contains convenience functions that provide WebWorker support out
of the box. The examples here are educational and *do not* need to be
implemented_

In our first process we might have a Web Worker:

```js
// make a new worker
const myWorker = new Worker("worker.js");

// js-rpc only wants/needs to use the first parameter of emit consequently the
// WebWorker post message can be used out of the box
const emit = myWorker.postMessage.bind(myWorker);

// js-rpc's on message wants/needs data to be its first parameter.  Since
// WebWorker.onmessage boxes passed data into an even we need to extract it
const on = myWorker.onmessage((event) => event.data);

// make a RPC Object:
const worker = ({ on, emit }, /* object to expose on worker process */);
```

In our second WebWorker process we have a slightly different API:

```js
// WebWorkers use a variable called "self" to register their messages:
// self.postMessage has the same api as in our previous example
const emit = self.postMessage.bind(self);

// self.onmessage also boxes data into events
const on = self.onmessage((event) => event.data);

// make a RPC Object:
const self = ({ on, emit }, /* object to expose on window process */);
```

## License

[LGPL](./LICENSE 'Lesser GNU Public License')
