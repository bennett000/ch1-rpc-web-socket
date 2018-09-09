const WebSocket = require('ws');
const wrpc = require('../intermediate/rpc-web-socket');
const port = 5151;
const wss = new WebSocket.Server({ port });

wss.on('connection', ws => {
  console.log('Web socket server received client connection');
  wrpc.create(
    { socket: ws },
    {
      foo: () => new Promise(resolve => resolve(7)),
    },
  );
});

wss.on('error', console.log.bind(console, 'Web socket server error'));

wss.on('listening', () => {
  console.log('Web socket server started on', port);
});
